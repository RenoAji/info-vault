import path from "path";
import fs from "fs";
import prisma from "@/lib/prisma";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { TokenTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { ChatOpenAI } from "@langchain/openai";

// Constants
const TOKEN_MAX = 1500;
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 0;

interface Source {
  id: number;
  url: string;
  name: string;
}

interface GenerateNoteResult {
  success: boolean;
  notes?: string;
  error?: string;
}

export const generateNote = async (
  vaultId: number | string
): Promise<GenerateNoteResult> => {
  try {
    // Validate environment variables
    const { OPENROUTER_API_KEY, OPENROUTER_MODEL } = process.env;
    if (!OPENROUTER_API_KEY) {
      return {
        success: false,
        error: "OPENROUTER_API_KEY is not set",
      };
    }

    // Validate vaultId
    if (!vaultId || isNaN(parseInt(String(vaultId)))) {
      return {
        success: false,
        error: "Valid vaultId is required",
      };
    }

    const vault = await prisma.vault.findUnique({
      where: { id: typeof vaultId === "string" ? parseInt(vaultId) : vaultId },
    });

    if (!vault) {
      return {
        success: false,
        error: "Vault not found",
      };
    }

    const vaultIdInt: number = parseInt(String(vaultId));

    const llm = new ChatOpenAI({
      model: OPENROUTER_MODEL || "deepseek/deepseek-r1-0528-qwen3-8b:free",
      apiKey: OPENROUTER_API_KEY,
      temperature: 1.0,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1", // The OpenRouter API endpoint
      },
    });

    // Fetch sources
    console.log("Fetching sources for vaultId:", vaultId);
    const sources: Source[] = await prisma.source.findMany({
      where: { vaultId: vaultIdInt },
      select: { id: true, url: true, name: true }, // Only select needed fields
    });

    if (sources.length === 0) {
      return {
        success: false,
        error: "No sources found for this vault",
      };
    }

    // Load and process documents
    const docs: Document[] = await loadDocuments(sources);
    if (docs.length === 0) {
      return {
        success: false,
        error: "No valid documents found to summarize",
      };
    }

    // Generate summary using optimized approach
    const finalSummary: string = await generateOptimizedNote(docs, llm);
    if (!finalSummary) {
      return {
        success: false,
        error: "Failed to generate summary",
      };
    }

    // Save to database
    await saveNote(vaultIdInt, finalSummary);

    return {
      success: true,
      notes: finalSummary,
    };
  } catch (error) {
    let errorMsg = "Failed to generate notes";
    if (error instanceof Error) {
      errorMsg = error.message;
      // Check for rate limit error
      if (
        errorMsg.includes("429") ||
        errorMsg.toLowerCase().includes("rate limit")
      ) {
        errorMsg =
          "Rate limit exceeded for the AI model. Please wait a minute and try again, or upgrade your API plan.";
      }
    }
    console.error("Error generating notes:", error);
    return {
      success: false,
      error: errorMsg,
    };
  }
};

// Helper Functions

async function loadDocuments(sources: Source[]): Promise<Document[]> {
  const textSplitter = new TokenTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  const docs: Document[] = [];

  for (const source of sources) {
    try {
      const filePath = path.resolve(source.url);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        continue;
      }

      const extension = path.extname(filePath).toLowerCase();
      let loader;

      switch (extension) {
        case ".pdf":
          loader = new PDFLoader(filePath);
          break;
        case ".txt":
          loader = new TextLoader(filePath);
          break;
        default:
          console.warn(
            `Unsupported file type: ${extension} for ${source.name}`
          );
          continue;
      }

      const loadedDocs = await loader.load();
      const splitDocs = await textSplitter.splitDocuments(loadedDocs);
      docs.push(...splitDocs);
    } catch (error) {
      console.error(`Error loading ${source.name}:`, error);
      // Continue with other documents instead of failing completely
    }
  }

  return docs;
}

// Optimized note generation with minimal AI requests
async function generateOptimizedNote(
  docs: Document[],
  llm: { invoke: (prompt: any) => Promise<any> }
): Promise<string> {
  // If we have few documents, use simple concatenation (1 request)
  if (docs.length <= 3) {
    return await generateSimpleNote(docs, llm);
  }

  // For many documents, use batched approach (2-4 requests total)
  return await generateBatchedNote(docs, llm);
}

// Simple concatenation for small document sets (1 AI request)
async function generateSimpleNote(
  docs: Document[],
  llm: { invoke: (prompt: any) => Promise<any> }
): Promise<string> {
  const allContent = docs.map((doc) => doc.pageContent).join("\n\n---\n\n");

  // Truncate if too long (stay within token limits)
  const maxChars = 15000; // Roughly 4000 tokens
  const truncatedContent =
    allContent.length > maxChars
      ? allContent.substring(0, maxChars) + "\n\n[Content truncated...]"
      : allContent;

  const prompt = [
    {
      role: "user",
      content: `Create a comprehensive summary of the following documents. Focus on the main themes, key points, and important insights:\n\n${truncatedContent}`,
    },
  ];

  const response = await llm.invoke(prompt);
  return String(response.content);
}

// Batch processing for larger document sets (2-4 AI requests)
async function generateBatchedNote(
  docs: Document[],
  llm: { invoke: (prompt: any) => Promise<any> }
): Promise<string> {
  const batchSize = 8; // Process 8 chunks at once to minimize requests
  const batches = [];

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const batchContent = batch.map((doc) => doc.pageContent).join("\n\n");
    batches.push(batchContent);
  }

  // If only one batch, use simple approach
  if (batches.length === 1) {
    const response = await llm.invoke([
      {
        role: "user",
        content: `Create a comprehensive summary of the following:\n\n${batches[0]}`,
      },
    ]);
    return String(response.content);
  }

  // Summarize each batch (parallel processing for speed)
  const batchSummaries = await Promise.all(
    batches.map(async (batchContent, index) => {
      const response = await llm.invoke([
        {
          role: "user",
          content: `Summarize the key points from this section (Part ${
            index + 1
          }):\n\n${batchContent}`,
        },
      ]);
      return response.content;
    })
  );

  // Final consolidated summary (1 more request)
  const finalSummary = await llm.invoke([
    {
      role: "user",
      content: `Create a final comprehensive summary by combining these section summaries. Focus on the main themes and key insights:\n\n${batchSummaries.join(
        "\n\n---\n\n"
      )}`,
    },
  ]);

  return String(finalSummary.content);
}

async function saveNote(vaultId: number, content: string) {
  return await prisma.note.upsert({
    where: { vaultId },
    update: {
      content,
      updatedAt: new Date(),
    },
    create: {
      name: `Summary Note`,
      vaultId,
      content,
    },
  });
}

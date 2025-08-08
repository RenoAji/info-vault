import path from "path";
import fs from "fs";
import prisma from "@/lib/prisma";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { TokenTextSplitter } from "@langchain/textsplitters";
import {
  collapseDocs,
  splitListOfDocs,
} from "langchain/chains/combine_documents/reduce";
import { Document } from "@langchain/core/documents";
import { StateGraph, Annotation, Send } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

// Constants
const TOKEN_MAX = 1000;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 0;

// Types
interface SummaryState {
  content: string;
}

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

    // Initialize LLM
    const llm = new ChatOpenAI({
      model: OPENROUTER_MODEL || "openrouter/horizon-beta",
      apiKey: OPENROUTER_API_KEY,
      temperature: 0.7, // Reduced for more consistent summaries
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
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

    // Create summarization graph
    const app = createSummarizationGraph(llm);

    // Generate summary
    const finalSummary: string | null = await generateSummary(app, docs);
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

function createSummarizationGraph(llm: ChatOpenAI) {
  // Prompts
  const mapPrompt = ChatPromptTemplate.fromMessages([
    ["user", "Write a concise summary of the following:\n\n{context}"],
  ]);

  const reducePrompt = ChatPromptTemplate.fromMessages([
    [
      "user",
      `The following is a set of summaries:
{docs}
Take these and distill it into a final, consolidated summary of the main themes.`,
    ],
  ]);

  // Length function
  async function lengthFunction(documents: Document[]) {
    const tokenCounts = await Promise.all(
      documents.map((doc) => llm.getNumTokens(doc.pageContent))
    );
    return tokenCounts.reduce((sum, count) => sum + count, 0);
  }

  // Reduce function
  async function reduce(docs: Document[]) {
    const prompt = await reducePrompt.invoke({
      docs: docs.map((doc) => doc.pageContent).join("\n\n"),
    });
    const response = await llm.invoke(prompt);
    return String(response.content);
  }

  // State definition
  const OverallState = Annotation.Root({
    contents: Annotation<string[]>,
    summaries: Annotation<string[]>({
      reducer: (state, update) => state.concat(update),
    }),
    collapsedSummaries: Annotation<Document[]>,
    finalSummary: Annotation<string>,
  });

  // Node functions
  const generateSummary = async (state: SummaryState) => {
    const prompt = await mapPrompt.invoke({ context: state.content });
    const response = await llm.invoke(prompt);
    return { summaries: [String(response.content)] };
  };

  const mapSummaries = (state: typeof OverallState.State) => {
    return state.contents.map(
      (content) => new Send("generateSummary", { content })
    );
  };

  const collectSummaries = async (state: typeof OverallState.State) => {
    return {
      collapsedSummaries: state.summaries.map(
        (summary) => new Document({ pageContent: summary })
      ),
    };
  };

  const collapseSummaries = async (state: typeof OverallState.State) => {
    const docLists = splitListOfDocs(
      state.collapsedSummaries,
      lengthFunction,
      TOKEN_MAX
    );
    const results = [];
    for (const docList of docLists) {
      results.push(await collapseDocs(docList, reduce));
    }
    return { collapsedSummaries: results };
  };

  const shouldCollapse = async (state: typeof OverallState.State) => {
    const numTokens = await lengthFunction(state.collapsedSummaries);
    return numTokens > TOKEN_MAX ? "collapseSummaries" : "generateFinalSummary";
  };

  const generateFinalSummary = async (state: typeof OverallState.State) => {
    const response = await reduce(state.collapsedSummaries);
    return { finalSummary: response };
  };

  // Build and return graph
  return new StateGraph(OverallState)
    .addNode("generateSummary", generateSummary)
    .addNode("collectSummaries", collectSummaries)
    .addNode("collapseSummaries", collapseSummaries)
    .addNode("generateFinalSummary", generateFinalSummary)
    .addConditionalEdges("__start__", mapSummaries, ["generateSummary"])
    .addEdge("generateSummary", "collectSummaries")
    .addConditionalEdges("collectSummaries", shouldCollapse, [
      "collapseSummaries",
      "generateFinalSummary",
    ])
    .addConditionalEdges("collapseSummaries", shouldCollapse, [
      "collapseSummaries",
      "generateFinalSummary",
    ])
    .addEdge("generateFinalSummary", "__end__")
    .compile();
}

async function generateSummary(
  app: any,
  docs: Document[]
): Promise<string | null> {
  const stream = await app.stream(
    { contents: docs.map((doc) => doc.pageContent) },
    { recursionLimit: 10 }
  );

  for await (const step of stream) {
    if (step.generateFinalSummary?.finalSummary) {
      return step.generateFinalSummary.finalSummary;
    }
  }

  return null;
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

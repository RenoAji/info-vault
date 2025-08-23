import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { generateNote } from "@/lib/services/generate-note";
import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";

export const GET = async (req: NextRequest) => {
  console.log("Mind map generation request received");
  try {
    // Validate vaultId
    const vaultId = req.nextUrl.searchParams.get("vaultId");
    if (!vaultId || isNaN(parseInt(vaultId))) {
      return NextResponse.json(
        { success: false, error: "Valid vaultId is required" },
        { status: 400 }
      );
    }

    const vaultIdInt = parseInt(vaultId);
    let note;

    // Fetch existing note from database
    const storedNote = await prisma.note.findUnique({
      where: { vaultId: vaultIdInt },
    });

    if (!storedNote) {
      console.log("No stored note found, generating new note...");
      const generatedNote = await generateNote(vaultIdInt);

      if (!generatedNote.success || !generatedNote.notes) {
        return NextResponse.json(
          {
            success: false,
            error: generatedNote.error || "Failed to generate note",
          },
          { status: 500 }
        );
      }

      note = generatedNote.notes;
      console.log("Note generated successfully");
    } else {
      note = storedNote.content;
      console.log("Using existing note from database");
    }

    // Validate note content
    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "No content available to create mind map" },
        { status: 400 }
      );
    }

    // Validate environment variables
    const { OPENROUTER_API_KEY, OPENROUTER_MODEL } = process.env;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    // Initialize LLM
    const llm = new ChatOpenAI({
      model: OPENROUTER_MODEL || "openai/gpt-3.5-turbo",
      apiKey: OPENROUTER_API_KEY,
      temperature: 0.7,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
    });

    const prompt =
      PromptTemplate.fromTemplate(`Analyze the following notes and convert them into a hierarchical mind map in JSON format.
Your task is to:
- Identify the central topic, main branches, and sub-branches from the provided notes.
- Structure this information into the specific JSON format shown in the example below.
- Generate a unique id for each node (e.g., main1, sub1a). The root node's id must be "root".
- Distribute the main branches as evenly as possible between "direction": "left" and "direction": "right" to create a balanced layout.
- Your final output must be only the JSON object, enclosed in a single JSON code block. Do not add any explanations, introductory text, or other conversational filler.

Required JSON Format Example:
\`\`\`
{{
"data": [
  {{ "id": "root", "topic": "The Power of Static Mind Maps" }},
  {{ "id": "declarative", "parentid": "root", "topic": "Declarative Display", "direction": "left" }},
  {{ "id": "declarative-1", "parentid": "declarative", "topic": "Clear structure" }},
  {{ "id": "declarative-2", "parentid": "declarative", "topic": "Excellent for reports" }},

  {{ "id": "performant", "parentid": "root", "topic": "Performant", "direction": "right" }},
  {{ "id": "performant-1", "parentid": "performant", "topic": "No state management overhead" }},
  {{ "id": "performant-2", "parentid": "performant", "topic": "Faster initial render" }},

  {{ "id": "simple", "parentid": "root", "topic": "Simple Code", "direction": "left" }},
  {{ "id": "simple-1", "parentid": "simple", "topic": "No event handlers" }},
  {{ "id": "simple-2", "parentid": "simple", "topic": "Less complex logic" }}
]
}}
\`\`\`

Notes to Process:
{note}`);

    // parser instance
    const parser = new JsonOutputParser();

    const chain = prompt.pipe(llm).pipe(parser);
    const response = await chain.invoke({
      note: note,
    });
    console.log("Mind map generation response:", response);

    await prisma.map.upsert({
      where: { vaultId: vaultIdInt },
      update: { content: response },
      create: {
        name: "Generated Mind Map",
        vaultId: vaultIdInt,
        content: response,
      },
    });

    return NextResponse.json({
      success: true,
      mindMap: response,
    });
  } catch (error) {
    console.error("Error generating mind map:", error);

    // Handle specific error types
    let errorMessage = "Failed to generate mind map";
    if (error instanceof Error) {
      if (
        error.message.includes("429") ||
        error.message.toLowerCase().includes("rate limit")
      ) {
        errorMessage = "Rate limit exceeded. Please wait and try again.";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
};

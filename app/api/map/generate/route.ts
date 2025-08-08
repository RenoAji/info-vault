import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { generateNote } from "@/lib/services/generate-note";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

export const GET = async (req: NextRequest) => {
  const vaultId = req.nextUrl.searchParams.get("vaultId");

  let note;

  // Fetch uploaded files from the database
  const storedNote = await prisma.note.findUnique({
    where: {
      vaultId: vaultId ? parseInt(vaultId) : undefined, // Ensure vaultId is an integer
    },
  });

  if (!storedNote && vaultId !== null) {
    const generatedNote = generateNote(vaultId);
    note = (await generatedNote).notes;
  } else {
    note = storedNote?.content || "";
  }

  const { OPENROUTER_API_KEY, OPENROUTER_MODEL } = process.env;

  // Initialize LLM
  const llm = new ChatOpenAI({
    model: OPENROUTER_MODEL || "openrouter/horizon-beta",
    apiKey: OPENROUTER_API_KEY,
    temperature: 0.7,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });

  const prompt = `Analyze the following notes and convert them into a hierarchical mind map in JSON format.
Your task is to:
    - Identify the central topic, main branches, and sub-branches from the provided notes.
    - Structure this information into the specific JSON format shown in the example below.
    - Generate a unique id for each node (e.g., main1, sub1a). The root node's id must be "root".
    - Distribute the main branches as evenly as possible between "direction": "left" and "direction": "right" to create a balanced layout.
    - Your final output must be only the JSON object, enclosed in a single JSON code block. Do not add any explanations, introductory text, or other conversational filler.
Required JSON Format Example
Your output must strictly follow this structure:
JSON
{
  "data": {
    "id": "root",
    "topic": "Central Topic",
    "children": [
      {
        "id": "main_idea_1",
        "topic": "Main Idea 1",
        "direction": "left",
        "children": [
          { "id": "sub_idea_1a", "topic": "Sub-idea 1a" },
          { "id": "sub_idea_1b", "topic": "Sub-idea 1b" }
        ]
      },
      {
        "id": "main_idea_2",
        "topic": "Main Idea 2",
        "direction": "right",
        "children": [
          { "id": "sub_idea_2a", "topic": "Sub-idea 2a" }
        ]
      },
      {
        "id": "main_idea_3",
        "topic": "Main Idea 3 without children",
        "direction": "left"
      }
    ]
  }
}

Notes to Process:
${note}
`;
  const messages = [new HumanMessage(prompt)];

  const response = await llm.invoke(messages);
};

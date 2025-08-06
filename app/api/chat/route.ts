import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCollection } from "@/lib/chroma";
import { ChatOpenAI } from "@langchain/openai";
import { _success } from "zod/v4/core";

export const POST = async (req: NextRequest) => {
  // llm
  const llm = new ChatOpenAI({
    model: process.env.OPENROUTER_MODEL || "openrouter/horizon-beta",
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1", // The OpenRouter API endpoint
    },
  });

  // User chat
  const { message, vaultId } = await req.json();

  // Get Chroma vector store

  // Use the shared helper instead of getCollection
  const collection = await getOrCreateCollection("source-embeddings");
  console.log(collection.embeddingFunction);

  // Define prompt for question-answering
  const promptTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");

  // Define state for application
  const InputStateAnnotation = Annotation.Root({
    question: Annotation<string>,
  });

  const StateAnnotation = Annotation.Root({
    question: Annotation<string>,
    context: Annotation<string[]>,
    answer: Annotation<string>,
  });

  // Define application steps
  const retrieve = async (state: typeof InputStateAnnotation.State) => {
    const retrievedDocs = await collection.query({
      queryTexts: [state.question],
      nResults: 5,
      where: vaultId ? { vaultId: parseInt(vaultId) } : undefined,
      include: ["documents"],
    });
    const documents = retrievedDocs.documents?.[0] ?? [];
    console.log("Retrieved documents:", documents);

    return {
      context: documents.filter((doc) => doc !== undefined && doc !== null),
    };
  };

  const generate = async (state: typeof StateAnnotation.State) => {
    const docsContent = state.context.join("\n");
    console.log("Context for LLM:", docsContent);
    const messages = await promptTemplate.invoke({
      question: state.question,
      context: docsContent,
    });
    console.log("Messages for LLM:", messages);
    const response = await llm.invoke(messages);
    return { answer: response.content };
  };

  // Compile application and test
  const graph = new StateGraph(StateAnnotation)
    .addNode("retrieve", retrieve)
    .addNode("generate", generate)
    .addEdge("__start__", "retrieve")
    .addEdge("retrieve", "generate")
    .addEdge("generate", "__end__")
    .compile();

  let inputs = { question: message };
  const result = await graph.invoke(inputs);
  console.log(result.context.slice(0, 2));
  console.log(`\nAnswer: ${result["answer"]}`);

  return NextResponse.json({
    success: true,
    answer: result.answer,
  });
};

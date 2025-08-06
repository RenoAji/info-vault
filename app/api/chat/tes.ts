import { StateGraph } from "@langchain/langgraph";
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCollection } from "@/lib/chroma";
import { ChatOpenAI } from "@langchain/openai";
import { _success } from "zod/v4/core";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { toolsCondition } from "@langchain/langgraph/prebuilt";

export const POST = async (req: NextRequest) => {
  // llm
  const { OPENROUTER_API_KEY, OPENROUTER_MODEL } = process.env;
  const llm = new ChatOpenAI({
    model: OPENROUTER_MODEL || "openrouter/horizon-beta",
    apiKey: OPENROUTER_API_KEY,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1", // The OpenRouter API endpoint
    },
  });

  // User chat
  const { message, vaultId } = await req.json();

  // Get Chroma vector store

  // Use the shared helper instead of getCollection
  const collection = await getOrCreateCollection("source-embeddings");

  const retrieveSchema = z.object({ query: z.string() });

  const retrieve = tool(
    async ({ query }) => {
      console.log("query : ", query);
      const retrievedDocs = await collection.query({
        queryTexts: [query],
        nResults: 5,
        where: vaultId ? { vaultId: parseInt(vaultId) } : undefined,
        include: ["documents", "metadatas"],
      });

      const docs = retrievedDocs.documents?.[0] ?? [];
      const metadatas = retrievedDocs.metadatas?.[0] ?? [];
      const serialized = [];
      for (let i = 0; i < docs.length; i++) {
        serialized.push(
          `Source: ${metadatas[i]?.source || "Undefined Source"}\nContent: ${
            docs[i]
          }`
        );
      }

      // Join the array into a single string here
      const formattedContent = serialized.join("\n\n---\n\n");

      // Return the formatted string as the main content
      return [formattedContent, retrievedDocs];
    },
    {
      name: "retrieve",
      description: "Retrieve information related to a query.",
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  );

  // Step 1: Generate an AIMessage that may include a tool-call to be sent.
  async function queryOrRespond(state: typeof MessagesAnnotation.State) {
    const llmWithTools = llm.bindTools([retrieve]);
    const response = await llmWithTools.invoke(state.messages);
    // MessagesState appends messages to state instead of overwriting
    return { messages: [response] };
  }

  // Step 2: Execute the retrieval.
  const tools = new ToolNode([retrieve]);

  // Step 3: Generate a response using the retrieved content.
  async function generate(state: typeof MessagesAnnotation.State) {
    // Get generated ToolMessages
    let recentToolMessages = [];
    for (let i = state["messages"].length - 1; i >= 0; i--) {
      let message = state["messages"][i];
      if (message instanceof ToolMessage) {
        recentToolMessages.push(message);
      } else {
        break;
      }
    }
    let toolMessages = recentToolMessages.reverse();

    // Format into prompt
    const docsContent = toolMessages.map((doc) => doc.content).join("\n");
    const systemMessageContent =
      "You are an assistant for question-answering tasks. " +
      "Use the following pieces of retrieved context to answer " +
      "the question. If you don't know the answer, say that you " +
      "don't know. Use three sentences maximum and keep the " +
      "answer concise." +
      "\n\n" +
      `${docsContent}`;

    const conversationMessages = state.messages.filter(
      (message) =>
        message instanceof HumanMessage ||
        message instanceof SystemMessage ||
        (message instanceof AIMessage &&
          (message.tool_calls?.length ?? 0) === 0)
    );
    const prompt = [
      new SystemMessage(systemMessageContent),
      ...conversationMessages,
    ];

    // Run
    const response = await llm.invoke(prompt);
    return { messages: [response] };
  }

  const graphBuilder = new StateGraph(MessagesAnnotation)
    .addNode("queryOrRespond", queryOrRespond)
    .addNode("tools", tools)
    .addNode("generate", generate)
    .addEdge("__start__", "queryOrRespond")
    .addConditionalEdges("queryOrRespond", toolsCondition, {
      __end__: "__end__",
      tools: "tools",
    })
    .addEdge("tools", "generate")
    .addEdge("generate", "__end__");

  const graph = graphBuilder.compile();

  const response = await graph.invoke({ messages: new HumanMessage(message) });

  console.log(response.messages);

  return NextResponse.json(
    {
      success: true,
      answer: response.messages[response.messages.length - 1].content,
    },
    { status: 200 }
  );
};

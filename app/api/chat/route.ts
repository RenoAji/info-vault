import { StateGraph } from "@langchain/langgraph";
import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCollection } from "@/lib/chroma";
import { ChatOpenAI } from "@langchain/openai";
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
  try {
    // llm
    const { OPENROUTER_API_KEY, OPENROUTER_MODEL } = process.env;
    const llm = new ChatOpenAI({
      model: OPENROUTER_MODEL || "openrouter/horizon-beta",
      apiKey: OPENROUTER_API_KEY,
      temperature: 1.0,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1", // The OpenRouter API endpoint
      },
    });

    // User chat
    const { messages, vaultId } = await req.json();

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
        const formattedContent = serialized.join("\n");

        // Return the formatted string as the main content
        return [formattedContent, retrievedDocs];
      },
      {
        name: "retrieve",
        description: "Retrieve information from user uploaded files or texts.",
        schema: retrieveSchema,
        responseFormat: "content_and_artifact",
      }
    );

    // Step 1: Generate an AIMessage that may include a tool-call to be sent.
    async function queryOrRespond(state: typeof MessagesAnnotation.State) {
      const systemMessage = new SystemMessage(
        `You are an assistant with a task to answer user questions 
      based on the user's uploaded documents.
      You should use the 'retrieve' tool to fetch relevant information.
      Except for general conversation (like "hello"), answer directly.`
      );
      const llmWithTools = llm.bindTools([retrieve]);
      const response = await llmWithTools.invoke([
        systemMessage,
        ...state.messages,
      ]);
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
      // In your generate function

      const systemMessageContent =
        "You are an assistant for question-answering tasks. " +
        "Your task is to answer the user's last question using the context provided below. " +
        "You should use the retrieved information to provide a concise and accurate answer. " +
        "If the context does not provide enough information, you can say 'I don't know'" +
        "\n\n--- CONTEXT ---\n" +
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
      console.log("Messages for LLM:", prompt);
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

    const response = await graph.invoke({
      messages: messages,
    });

    console.log(response.messages);

    return NextResponse.json(
      {
        success: true,
        answer: response.messages[response.messages.length - 1].content,
      },
      { status: 200 }
    );
  } catch (error) {
    let errorMsg = "Failed to process your request.";
    if (
      error instanceof Error &&
      (error.message.includes("429") ||
        error.message.toLowerCase().includes("rate limit"))
    ) {
      errorMsg =
        "Rate limit exceeded for the AI model. Please wait until your quota resets or upgrade your API plan.";
    }
    console.error("Chat error:", error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 429 }
    );
  }
};

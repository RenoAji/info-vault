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
import {
  generateSystemPrompt,
  queryOrRespondSystemPrompt,
} from "@/lib/prompts";
import { LRUCache } from "lru-cache";

const queryCache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 60 * 5,
});

export const POST = async (req: NextRequest) => {
  console.log("Chat request received");
  try {
    const { OPENROUTER_API_KEY, OPENROUTER_MODEL } = process.env;
    const llm = new ChatOpenAI({
      model: OPENROUTER_MODEL,
      apiKey: OPENROUTER_API_KEY,
      temperature: 1.0,
      timeout: 120000,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
    });

    const { messages, vaultId } = await req.json();
    console.log(vaultId);

    const collection = await getOrCreateCollection("source-embeddings");
    const retrieveSchema = z.object({ query: z.string() });

    const retrieve = tool(
      async ({ query }) => {
        const cacheKey = `${vaultId}-${query}`;
        if (queryCache.has(cacheKey)) {
          return queryCache.get(cacheKey);
        }

        const result = await collection.query({
          queryTexts: [query],
          nResults: 3,
          where: vaultId ? { vaultId: parseInt(String(vaultId)) } : undefined,
          include: ["documents", "metadatas"],
        });

        const documents = result.documents?.[0] ?? [];
        const metadatas = result.metadatas?.[0] ?? [];

        const formattedContent = documents
          .map((doc, index) => {
            const metadata = metadatas[index];
            return `Document ${index + 1}:\n${doc}\nSource: ${
              metadata?.source || "Unknown"
            }\nPage: ${metadata?.page || "N/A"}\n---`;
          })
          .join("\n");

        const toolResult = [
          formattedContent,
          {
            documents,
            metadatas,
            query,
            resultsCount: documents.length,
          },
        ];

        queryCache.set(cacheKey, toolResult);
        return toolResult;
      },
      {
        name: "retrieve",
        description: "Retrieve information from user uploaded files or texts.",
        schema: retrieveSchema,
        responseFormat: "content_and_artifact",
      }
    );

    const llmWithTools = llm.bindTools([retrieve]);

    async function queryOrRespond(state: typeof MessagesAnnotation.State) {
      const systemMessage = new SystemMessage(queryOrRespondSystemPrompt);
      const response = await llmWithTools.invoke([
        systemMessage,
        ...state.messages,
      ]);
      return { messages: [response] };
    }

    const tools = new ToolNode([retrieve]);

    async function generate(state: typeof MessagesAnnotation.State) {
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

      const docsContent = toolMessages.map((doc) => doc.content).join("\n");
      console.log("Docs content for LLM:", docsContent);

      const systemMessageContent = generateSystemPrompt(docsContent);

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

    const eventStream = await graph.stream(
      { messages },
      { streamMode: "messages" }
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const [chunk, metadata] of eventStream as any) {
            if ((metadata as any)?.langgraph_node !== "generate") continue;
            const content =
              typeof (chunk as any).content === "string"
                ? (chunk as any).content
                : "";
            if (content) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "token", content })}\n\n`
                )
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
        } catch (error) {
          let errorMsg = "Failed to process your request.";
          if (
            error instanceof Error &&
            (error.message.includes("429") ||
              error.message.toLowerCase().includes("rate limit"))
          ) {
            errorMsg =
              "Rate limit exceeded for the AI model. Please wait and try again.";
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
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

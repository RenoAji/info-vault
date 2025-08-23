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
  console.log("Chat request received");
  try {
    // llm
    const { OPENROUTER_API_KEY, OPENROUTER_MODEL, GOOGLE_API_KEY } =
      process.env;
    const llm = new ChatOpenAI({
      model: OPENROUTER_MODEL || "deepseek/deepseek-r1-0528-qwen3-8b:free",
      apiKey: OPENROUTER_API_KEY,
      temperature: 1.0,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1", // The OpenRouter API endpoint
      },
    });
    // Initialize the Gemini model
    // const llm = new ChatGoogleGenerativeAI({
    //   model: "gemini-1.5-flash",
    //   apiKey: GOOGLE_API_KEY,
    // });

    // User chat
    const { messages, vaultId } = await req.json();

    // Get Chroma vector store

    // Use the shared helper instead of getCollection
    const collection = await getOrCreateCollection("source-embeddings");

    const retrieveSchema = z.object({ query: z.string() });

    // Add caching for vector queries
    const queryCache = new Map();

    const retrieve = tool(
      async ({ query }) => {
        // Simple cache to avoid repeated queries
        const cacheKey = `${vaultId}-${query}`;
        if (queryCache.has(cacheKey)) {
          return queryCache.get(cacheKey);
        }

        const result = await collection.query({
          queryTexts: [query],
          nResults: 5,
          where: vaultId ? { vaultId: parseInt(vaultId) } : undefined,
          include: ["documents", "metadatas"],
        });

        // Extract and format the documents
        const documents = result.documents?.[0] ?? [];
        const metadatas = result.metadatas?.[0] ?? [];

        // Format as content string
        const formattedContent = documents
          .map((doc, index) => {
            const metadata = metadatas[index];
            return `Document ${index + 1}:\n${doc}\nSource: ${
              metadata?.source || "Unknown"
            }\nPage: ${metadata?.page || "N/A"}\n---`;
          })
          .join("\n");

        // Return as two-tuple for content_and_artifact format
        const toolResult = [
          formattedContent, // content
          {
            documents,
            metadatas,
            query,
            resultsCount: documents.length,
          }, // artifact
        ];

        queryCache.set(cacheKey, toolResult);
        return toolResult;
      },
      {
        name: "retrieve",
        description: "Retrieve information from user uploaded files or texts.",
        schema: retrieveSchema,
        responseFormat: "content_and_artifact", // This requires a two-tuple return
      }
    );

    const llmWithTools = (() => {
      const llm = new ChatOpenAI({
        model: OPENROUTER_MODEL || "deepseek/deepseek-r1-0528-qwen3-8b:free",
        apiKey: OPENROUTER_API_KEY,
        temperature: 1.0,
        configuration: {
          baseURL: "https://openrouter.ai/api/v1", // The OpenRouter API endpoint
        },
      });
      return llm.bindTools([retrieve]);
    })();

    // Step 1: Generate an AIMessage that may include a tool-call to be sent.
    async function queryOrRespond(state: typeof MessagesAnnotation.State) {
      const systemMessage = new SystemMessage(
        `You are InfoVault AI, an intelligent document assistant. Your role is to help users understand and analyze their uploaded documents.

Key Instructions:
- Use the 'retrieve' tool to search through the user's documents when they ask questions about their content
- Extract specific keywords or concepts from user questions to create effective search queries
- For general greetings or small talk, respond directly without using tools
- Always prioritize accuracy and cite sources when referencing document content
- If unsure about document content, use the retrieve tool rather than guessing

Example queries to extract:
- User: "What are the main points about machine learning?" → Query: "machine learning main points"
- User: "How does the integration process work?" → Query: "integration process steps"
- User: "Tell me about the conclusion" → Query: "conclusion summary findings"`
      );
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
      console.log("Docs content for LLM:", docsContent);
      // In your generate function

      const systemMessageContent = `You are InfoVault AI, a specialized document analysis assistant. Your task is to provide comprehensive and accurate answers based on the retrieved document context.

Guidelines:
- Analyze the provided context carefully and synthesize information from multiple sources when available
- Provide specific, actionable answers that directly address the user's question
- When referencing information, mention the source document or page when possible
- If the context contains conflicting information, acknowledge this and explain the differences
- Structure complex answers with clear headings, bullet points, or numbered lists for readability
- If the context lacks sufficient information to fully answer the question, clearly state what's missing
- Maintain a professional but conversational tone

Context from your knowledge base:
${docsContent}

Now, provide a comprehensive answer to the user's question using this context.`;

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

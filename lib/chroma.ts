import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";

const embedder = new DefaultEmbeddingFunction();
const client = new ChromaClient();

// Helper function to get or create collection with consistent embedding
async function getOrCreateCollection(name: string) {
  return client.getOrCreateCollection({
    name,
    embeddingFunction: embedder,
  });
}

export { client, embedder, getOrCreateCollection };

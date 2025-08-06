import { client } from "@/lib/chroma";

(async () => {
  console.log("Clearing Chroma vector store...");
  const collection = await client.getCollection({ name: "source-embeddings" });

  // Fetch all IDs
  const results = await collection.get({ limit: 5 }); // Adjust limit as needed
  console.log(results);
})();

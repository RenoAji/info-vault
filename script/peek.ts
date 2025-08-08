import { client } from "@/lib/chroma";

(async () => {
  const collection = await client.getCollection({ name: "source-embeddings" });

  // Fetch all IDs
  const results = await collection.get({ limit: 1000 }); // Adjust limit as needed
  console.log(results);
})();

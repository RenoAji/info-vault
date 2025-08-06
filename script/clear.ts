import { client } from "@/lib/chroma";

(async () => {
  console.log("Delete Collection: source-embeddings");
  await client.deleteCollection({ name: "source-embeddings" });
  console.log("Done!");
})();

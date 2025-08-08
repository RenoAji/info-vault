import { getOrCreateCollection } from "@/lib/chroma";

(async () => {
  console.log("Delete from: source-embeddings");
  const collection = await getOrCreateCollection("source-embeddings");
  await collection.delete({
    where: { vaultId: 7 },
  });
  console.log("Done!");
})();

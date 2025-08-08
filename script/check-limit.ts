async function main() {
  const { OPENROUTER_API_KEY } = process.env;
  const response = await fetch("https://openrouter.ai/api/v1/key", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
  });
  console.log("Response :", await response);
}
main().catch(console.error);

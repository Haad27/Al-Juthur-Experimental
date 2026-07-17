async function run() {
  const url = "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json";
  console.log("Fetching config.json from HF...", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data size:", JSON.stringify(data).length);
  } catch (e: any) {
    console.error("Fetch failed:", e.message || e);
  }
}
run();

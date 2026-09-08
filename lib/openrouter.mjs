// Browser-only connection: never send the user's key to the hosting server.
export async function streamChat({ key, model, messages, maxTokens, signal, onChunk, onUsage }) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", signal,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "Relay" },
    body: JSON.stringify({ model, messages, stream: true, max_tokens: maxTokens }),
  });
  if (!response.ok) {
    const friendly = {401:"Your API key was rejected. Check it in settings.",402:"Your OpenRouter account needs more credits.",429:"Rate limit reached. Wait a moment and try again."};
    throw new Error(friendly[response.status] || `OpenRouter could not complete the request (${response.status}). Try a different model.`);
  }
  if (!response.body) throw new Error("Streaming is unavailable in this browser.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", data = [], completed = false, terminal = false;
  function dispatch() {
    if (!data.length) return;
    const payload = data.join("\n"); data = [];
    if (payload === "[DONE]") { completed = true; return; }
    const event = JSON.parse(payload);
    if (event.error || event.choices?.[0]?.finish_reason === "error") throw new Error("The provider stopped with an error. Try again or select another model.");
    if (event.choices?.[0]?.finish_reason) terminal = true;
    const content = event.choices?.[0]?.delta?.content;
    if (typeof content === "string" && content) onChunk(content);
    if (event.usage) onUsage?.(event.usage);
  }
  function line(value) {
    value = value.replace(/\r$/, "");
    if (!value) dispatch();
    else if (value.startsWith("data:")) data.push(value.slice(5).replace(/^ /,""));
  }
  try {
    while (!completed) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) { line(buffer.slice(0,end)); buffer = buffer.slice(end+1); }
      if (done) { if (buffer) line(buffer); dispatch(); break; }
    }
    if (!completed && !terminal) throw new Error("Connection ended before the response finished. The partial response is saved.");
  } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}

// Client for the /api/ellie serverless function. Streams plain text back.
// Errors carry a `code`: not_configured | rate_limited | bad_request | upstream | network.

export async function askEllie(body, { signal, onText } = {}) {
  let res;
  try {
    res = await fetch("/api/ellie", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e && e.name === "AbortError") throw e;
    throw Object.assign(new Error("network"), { code: "network" });
  }
  if (!res.ok) {
    let code = "upstream";
    try { code = (await res.json()).code || code; } catch {}
    if (res.status === 429) code = "rate_limited";
    throw Object.assign(new Error(code), { code });
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    if (onText) onText({ text });
  }
  text += dec.decode();
  // The server appends this marker if the upstream stream broke mid-way.
  if (text.includes("\u0000ERROR")) {
    const partial = text.split("\u0000ERROR")[0];
    throw Object.assign(new Error("upstream"), { code: "upstream", text: partial });
  }
  return { text };
}

export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 4.5 * 1024 * 1024) return reject(Object.assign(new Error("too_big"), { code: "too_big" }));
    const r = new FileReader();
    r.onload = () => {
      const [head, data] = String(r.result).split(",");
      const media_type = (head.match(/data:([^;]+)/) || [])[1] || file.type;
      resolve({ media_type, data });
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

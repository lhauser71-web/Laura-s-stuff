// Minimal markdown renderer for Ellie's note. Escapes everything first, then adds a small set of tags.
export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function md(t) {
  const lines = (t || "").split(/\n/);
  let out = "", list = null;
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const close = () => { if (list) { out += "</" + list + ">"; list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^#{1,4}\s/.test(l)) {
      close();
      const txt = l.replace(/^#+\s*/, "");
      const m = txt.match(/^VERDICT:\s*(.*)$/i);
      if (m) {
        const v = m[1];
        const cls = /^pass\b/i.test(v) ? "bad" : /condition/i.test(v) ? "warn" : "good";
        const parts = v.split(/\s+[—–-]\s+/);
        const why = parts.slice(1).join(" — ").trim();
        out += '<h3>Verdict</h3><div class="verdict"><span class="chip ' + cls + '">' + esc(parts[0].trim()) + "</span>" + (why ? '<p class="verdict-why">' + inline(why) + "</p>" : "") + "</div>";
        continue;
      }
      out += "<h3>" + inline(txt) + "</h3>";
      continue;
    }
    if (/^\s*[-*]\s+/.test(l)) {
      if (list !== "ul") { close(); out += "<ul>"; list = "ul"; }
      out += "<li>" + inline(l.replace(/^\s*[-*]\s+/, "")) + "</li>";
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(l)) {
      if (list !== "ol") { close(); out += "<ol>"; list = "ol"; }
      out += "<li>" + inline(l.replace(/^\s*\d+[.)]\s+/, "")) + "</li>";
      continue;
    }
    if (!l.trim()) { close(); continue; }
    close();
    out += "<p>" + inline(l) + "</p>";
  }
  close();
  return out;
}

export function verdictOf(text) {
  return ((text || "").match(/VERDICT:\s*([^—–\-\n]+)/i) || [])[1]?.trim() || "";
}

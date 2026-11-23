// Parse Ellie Jr.'s markdown note into structured report sections.
// Shared by the results page (src/Report.jsx) and the email/PDF sender (api/send.js).
// Copes with partial text while a note is still streaming in.

function sectionKey(title) {
  if (/numbers that matter|three numbers/i.test(title)) return "numbers";
  if (/red flag/i.test(title)) return "flags";
  if (/question/i.test(title)) return "questions";
  if (/data.?room/i.test(title)) return "dataroom";
  if (/change my mind/i.test(title)) return "mind";
  return "other:" + title;
}

export function parseReport(text) {
  const out = { verdict: null, sections: {}, order: [] };
  let cur = null;
  for (const raw of (text || "").split(/\n/)) {
    const l = raw.trim();
    if (!l) continue;
    if (/^#{1,4}\s/.test(l)) {
      const t = l.replace(/^#+\s*/, "");
      const v = t.match(/^VERDICT:\s*(.*)$/i);
      if (v) { out.verdict = parseVerdict(v[1]); cur = null; continue; }
      const k = sectionKey(t);
      if (!out.sections[k]) { out.sections[k] = { title: t, items: [], text: [] }; out.order.push(k); }
      cur = out.sections[k];
      continue;
    }
    if (!cur) continue;
    const item = l.match(/^(?:[-*]|\d+[.)])\s+(.*)$/);
    if (item) cur.items.push(item[1]);
    else cur.text.push(l);
  }
  return out;
}

export function sentence(s) {
  let t = (s || "").trim();
  if (!t) return "";
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(t) ? t : t + ".";
}

export function parseVerdict(v) {
  const parts = v.split(/\s+[—–-]\s+/);
  const label = parts[0].trim();
  const why = parts.slice(1).join(" — ");
  const rag = /^pass\b/i.test(label) ? "red" : /condition/i.test(label) ? "amber" : /pursue/i.test(label) ? "green" : "amber";
  return { label, rag, why: sentence(why) };
}

const NUM = /[-+−]?[$£€¥]?\d[\d,]*(?:\.\d+)?\s?(?:%|bps|x|bn|m|M|k)?/;
export function parseNumber(item) {
  const m = item.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  const head = (m ? m[1] : item).replace(/[.:]\s*$/, "").trim();
  const body = m ? m[2].trim() : "";
  const n = head.match(NUM);
  if (!n) return { value: "", label: head, body };
  const value = n[0].trim();
  let label = head.startsWith(n[0]) ? head.slice(n[0].length).replace(/^[\s,]+/, "") : head;
  label = label.charAt(0).toUpperCase() + label.slice(1);
  return { value, label, body };
}

export function parseFlag(item) {
  const m = item.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  const title = m ? m[1].replace(/[.:]\s*$/, "") : "";
  let rest = (m ? m[2] : item).replace(/^[—–\-:]\s*/, "");
  const [body, check] = rest.split(/\s*\bCheck:\s*/);
  const cap = (t) => { t = (t || "").trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ""; };
  return { title, body: cap(body), check: cap(check) };
}


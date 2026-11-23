// One-page IC first-pass PDF, built directly with pdf-lib (no browser needed).
// Shrinks the body text a step at a time until everything fits on a single A4 page.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const INK = rgb(0.125, 0.114, 0.114), MUTED = rgb(0.42, 0.4, 0.38), RULE = rgb(0.886, 0.886, 0.886);
const ORANGE = rgb(0.882, 0.369, 0.161), WHITE = rgb(1, 1, 1), PAPER = rgb(0.945, 0.941, 0.933);
const RAG = { red: rgb(0.851, 0.227, 0.184), amber: rgb(0.851, 0.541, 0), green: rgb(0.122, 0.616, 0.388) };

// Standard PDF fonts only cover Latin-1 plus a few extras: map the rest to safe equivalents.
function safe(s) {
  return String(s ?? "")
    .replace(/\*\*/g, "")
    .replace(/[−‑]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/→/g, "->").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/✓/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF–—•…·×£€]/g, "");
}

function wrap(text, font, size, width) {
  const out = [];
  for (const para of safe(text).split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const t = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(t, size) <= width) line = t;
      else { if (line) out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

export async function buildBriefPdf(b) {
  for (const scale of [1, 0.94, 0.88, 0.82, 0.76, 0.7]) {
    const doc = await PDFDocument.create();
    const pdf = await draw(doc, b, scale);
    if (pdf) return pdf;
  }
  return draw(await PDFDocument.create(), b, 0.7, true);
}

async function draw(doc, b, k, force = false) {
  doc.setTitle(safe(`IC first pass: ${b.dealName}`));
  doc.setAuthor("5D Deal Screen");
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 36, CW = W - M * 2;
  const page = doc.addPage([W, H]);
  let y = H;

  const text = (s, x, yy, size, font = reg, color = INK) => page.drawText(safe(s), { x, y: yy, size, font, color });
  const para = (s, x, width, size, font = reg, color = INK, lh = 1.35) => {
    for (const l of wrap(s, font, size, width)) { y -= size * lh; text(l, x, y, size, font, color); }
  };
  const heading = (s) => { y -= 16 * k; text(s.toUpperCase(), M, y - 11 * k, 11 * k, bold, INK); y -= 15 * k; };
  const fits = () => force || y > M + 20;

  // Header band
  page.drawRectangle({ x: 0, y: H - 46, width: W, height: 46, color: INK });
  text("DEAL SCREEN", M, H - 29, 13, bold, WHITE);
  text("Ellie Jr.'s first pass", M + bold.widthOfTextAtSize("DEAL SCREEN", 13) + 8, H - 29, 13, reg, ORANGE);
  const d = safe(b.date);
  text(d, W - M - reg.widthOfTextAtSize(d, 9), H - 28, 9, reg, rgb(0.74, 0.71, 0.69));
  y = H - 46 - 20;

  // Deal
  para(b.dealName, M, CW, 17 * k, bold, INK, 1.15);
  if (b.meta) para(b.meta, M, CW, 9 * k, reg, MUTED);

  // KPI row
  y -= 10 * k;
  const kw = CW / b.kpis.length, kh = 38 * k;
  b.kpis.forEach(([kk, v], i) => {
    const x = M + i * kw;
    page.drawRectangle({ x, y: y - kh, width: kw - 4, height: kh, color: PAPER });
    page.drawRectangle({ x, y: y - 2.5, width: kw - 4, height: 2.5, color: ORANGE });
    text(kk.toUpperCase(), x + 6, y - 13 * k, 6.5 * k, reg, MUTED);
    text(v, x + 6, y - 30 * k, 14 * k, bold, INK);
  });
  y -= kh;

  // Verdict
  y -= 12 * k;
  const rc = RAG[b.verdictRag] || RAG.amber;
  const vTop = y;
  const vLines = wrap(b.verdictReason, reg, 9.5 * k, CW - 24);
  const vh = 30 * k + vLines.length * 9.5 * k * 1.35 + 10;
  page.drawRectangle({ x: M, y: vTop - vh, width: CW, height: vh, color: rgb(0.99, 0.95, 0.94), borderColor: RULE, borderWidth: 0.5 });
  page.drawRectangle({ x: M, y: vTop - vh, width: 5, height: vh, color: rc });
  text("ELLIE JR.'S VERDICT", M + 14, vTop - 12 * k, 6.5 * k, reg, MUTED);
  text(b.verdict.toUpperCase(), M + 14, vTop - 30 * k, 18 * k, bold, rc);
  y = vTop - 30 * k - 4;
  for (const l of vLines) { y -= 9.5 * k * 1.35; text(l, M + 14, y, 9.5 * k, reg, INK); }
  y = vTop - vh;

  // Three numbers
  if (b.numbers.length) {
    heading("The three numbers that matter");
    const n = b.numbers.length, gw = CW / n;
    const top = y;
    let low = y;
    b.numbers.forEach((num, i) => {
      const x = M + i * gw;
      y = top;
      y -= 20 * k; text(num.value, x, y, 20 * k, bold, ORANGE); y -= 5 * k;
      const lab = wrap(num.label.toUpperCase(), bold, 7 * k, gw - 12);
      for (const l of lab) { y -= 7 * k * 1.4; text(l, x, y, 7 * k, bold, INK); }
      for (const l of wrap(num.body, reg, 8 * k, gw - 12)) { y -= 8 * k * 1.35; text(l, x, y, 8 * k, reg, MUTED); }
      low = Math.min(low, y);
    });
    y = low;
  }

  // Red flags
  if (b.flags.length) {
    heading("Red flags: potential blockers");
    for (const f of b.flags) {
      y -= 2;
      text("×", M, y - 9 * k, 10 * k, bold, RAG.red);
      const line = (f.title ? f.title + ". " : "") + f.body + (f.check ? " Check: " + f.check : "");
      const ls = wrap(line, reg, 8.5 * k, CW - 14);
      ls.forEach((l, i) => { y -= 8.5 * k * 1.35; if (i === 0 && f.title) { const t = safe(f.title + ". "); text(t, M + 14, y, 8.5 * k, bold, INK); text(l.slice(t.length), M + 14 + bold.widthOfTextAtSize(t, 8.5 * k) + 2.5, y, 8.5 * k, reg, INK); } else text(l, M + 14, y, 8.5 * k, reg, INK); });
    }
  }

  // Questions + data room side by side
  if (b.questions.length || b.dataroom.length) {
    heading("Questions for the broker  ·  Data room request");
    const top = y, half = (CW - 16) / 2;
    b.questions.forEach((q, i) => {
      const ls = wrap(q, reg, 8.5 * k, half - 16);
      ls.forEach((l, j) => { y -= 8.5 * k * 1.35; if (j === 0) text(`${i + 1}.`, M, y, 8.5 * k, bold, ORANGE); text(l, M + 14, y, 8.5 * k, reg, INK); });
      y -= 2;
    });
    const qLow = y;
    y = top;
    b.dataroom.forEach((dr) => {
      const ls = wrap(dr, reg, 8.5 * k, half - 14);
      ls.forEach((l, j) => { y -= 8.5 * k * 1.35; if (j === 0) text("•", M + half + 16, y, 8.5 * k, bold, ORANGE); text(l, M + half + 28, y, 8.5 * k, reg, INK); });
      y -= 2;
    });
    y = Math.min(qLow, y);
  }

  // What would change my mind
  if (b.mind) {
    heading("What would change my mind");
    para(b.mind, M, CW, 9 * k);
  }

  // Footer
  const foot = "Prepared with 5D Deal Screen. Every number is calculated from the inputs given. A first pass for your team to check, not advice.";
  page.drawLine({ start: { x: M, y: M + 6 }, end: { x: W - M, y: M + 6 }, thickness: 0.5, color: RULE });
  text(foot, M, M - 6, 7, reg, MUTED);

  if (!fits()) return null;
  return doc.save();
}

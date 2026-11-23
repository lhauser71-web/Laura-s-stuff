// IC first-pass PDF (one or two A4 pages), styled like the results screen (src/Report.jsx + the .rp-* styles):
// grey paper, page banner, deal title band, RAG verdict card, black "three numbers" band with
// segmented bars, red-flag blockers, "the deal in numbers" KPI tiles, orange question cards,
// data room checklist and the orange "what would change my mind" callout.
// Brand fonts (League Gothic, IBM Plex Mono; SIL OFL, see assets/OFL-fonts.txt) are embedded.
// Body text is ~9.5 pt; sections never split across pages; a footer with page numbers on each page.

import fs from "node:fs";
import { PDFDocument, rgb, LineCapStyle } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const asset = (name) => fs.readFileSync(new URL(`./assets/${name}`, import.meta.url));

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const mix = (a, b, t) => rgb(a.red + (b.red - a.red) * t, a.green + (b.green - a.green) * t, a.blue + (b.blue - a.blue) * t);
const C = {
  paper: hex("#f1f0ee"), panel: hex("#ffffff"), rule: hex("#e2e2e2"), ink: hex("#201d1d"), muted: hex("#6b6562"),
  black: hex("#201d1d"), tile: hex("#2a2626"), tileLine: hex("#3a3534"), light: hex("#bdb6b1"), lighter: hex("#f2eeea"), dim: hex("#8a827d"),
  orange: hex("#e15e29"), orangeTint: hex("#fdf0ea"), white: hex("#ffffff"), seg: hex("#3a3534"),
};
const RAG = { green: hex("#1f9d63"), amber: hex("#d98a00"), red: hex("#d93a2f") };
const BAR = { green: hex("#3ccf8e"), amber: hex("#f5a524"), red: hex("#ff5a4f") };

const ICON = {
  x: "M6 6l12 12M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7",
  bang: "M12 6v8M12 18.5v.01",
  doc: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6",
  bulb: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z",
};
const rr = (w, h, r) => `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;

function safe(s) {
  return String(s ?? "").replace(/\*\*/g, "").replace(/→/g, "->").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/[✓✔]/g, "")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "").replace(/\s+/g, " ").trim();
}
function wrap(text, font, size, width) {
  const out = [];
  let line = "";
  for (const word of safe(text).split(" ").filter(Boolean)) {
    const t = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(t, size) <= width || !line) line = t;
    else { out.push(line); line = word; }
  }
  if (line) out.push(line);
  return out;
}
const splitUnit = (v) => { const m = String(v).match(/^(.*?\d)\s?(bps|bn|m|M|k)$/); return m ? [m[1], m[2]] : [String(v), ""]; };

export async function buildBriefPdf(b) {
  const files = { lg: asset("LeagueGothic.ttf"), mono: asset("IBMPlexMono-Regular.ttf"), monoB: asset("IBMPlexMono-SemiBold.ttf"), mark: asset("mark5d.png"), logo: asset("logo-ink.png") };
  // Measure, then draw once at the largest scale that fits two pages.
  const probe = await setup(files);
  let k = 1;
  // Readable sizes first (body ~9.5 pt); only shrink if a very long note would run past two pages.
  for (const s of [1.3, 1.25, 1.2, 1.15, 1.1, 1.05, 1, 0.96, 0.92, 0.88]) { k = s; if (layout(probe, b, s, true) <= 2) break; }
  const ctx = await setup(files);
  layout(ctx, b, k, false);
  return ctx.doc.save();
}

async function setup(f) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  return {
    doc,
    lg: await doc.embedFont(f.lg, { subset: true }),
    mono: await doc.embedFont(f.mono, { subset: true }),
    monoB: await doc.embedFont(f.monoB, { subset: true }),
    mark: await doc.embedPng(f.mark),
    logo: await doc.embedPng(f.logo),
  };
}

// Returns the number of pages used. With dry=true nothing is drawn. Sections never split across pages.
function layout(ctx, b, k, dry) {
  const { doc, lg, mono, monoB } = ctx;
  const W = 595.28, H = 841.89, M = 26, CW = W - 2 * M, FOOT = 34;
  let page = null, pages = 0, y = H;
  const newPage = () => {
    pages += 1;
    if (!dry) { page = doc.addPage([W, H]); page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.paper }); }
    y = pages === 1 ? H : H - 30;
  };
  newPage();
  // Start a new page when the next section won't fit above the footer.
  const fit = (h) => { if (y - h < FOOT + 6 && y < H - 60) newPage(); };
  if (!dry) { doc.setTitle(safe(`Fifth Dimension - ${b.dealName} Screen`)); doc.setAuthor("Fifth Dimension Deal Screen"); }
  const P = (fn) => { if (!dry) fn(page); };
  const text = (s, x, y, size, font, color, opts = {}) => P((p) => p.drawText(safe(s), { x, y, size, font, color, ...opts }));
  const rect = (x, top, w, h, color, extra = {}) => P((p) => p.drawRectangle({ x, y: top - h, width: w, height: h, color, ...extra }));
  const round = (x, top, w, h, r, opts) => P((p) => p.drawSvgPath(rr(w, h, r), { x, y: top, ...opts }));
  const icon = (name, cx, cy, size, color, width = 3) => P((p) => p.drawSvgPath(ICON[name], { x: cx - size / 2, y: cy + size / 2, scale: size / 24, borderColor: color, borderWidth: width, borderLineCap: LineCapStyle.Round }));
  const lh = (s, f = 1.42) => s * f;
  const GAP = 9 * k;


  // ---- page banner (same as the site header) ----
  const kb = Math.min(k, 1);
  const markH = 36 * kb, markW = (ctx.mark.width / ctx.mark.height) * markH;
  P((p) => p.drawImage(ctx.mark, { x: M, y: H - 12 * kb - markH, width: markW, height: markH }));
  const t1 = "DEAL SCREEN: A SENIOR ANALYST ", t2 = "ON EVERY DEAL", ts = 27 * kb;
  text(t1, M + markW + 14 * kb, H - 12 * kb - markH / 2 - ts * 0.33, ts, lg, C.muted);
  text(t2, M + markW + 14 * kb + lg.widthOfTextAtSize(t1, ts), H - 12 * kb - markH / 2 - ts * 0.33, ts, lg, hex("#a39b95"));
  y = H - 24 * kb - markH;
  P((p) => p.drawLine({ start: { x: 0, y }, end: { x: W, y }, thickness: 0.6, color: C.rule }));
  y -= 12 * kb;

  // ---- deal band ----
  {
    const pad = 16 * k, iw = CW - 2 * pad;
    const nameS = 30 * k, nameLines = wrap(String(b.dealName).toUpperCase(), lg, nameS, iw);
    const h = pad + nameLines.length * nameS * 0.98 + 4 * k + lh(7.5 * k) + pad - 4 * k;
    fit(h);
    rect(M, y, CW, h, C.black);
    let yy = y - pad;
    for (const l of nameLines) { yy -= nameS * 0.98; text(l, M + pad, yy + nameS * 0.18, nameS, lg, C.white); }
    yy -= 4 * k + 7.5 * k;
    text([b.date, b.meta].filter(Boolean).join("  ·  "), M + pad, yy, 7.5 * k, mono, C.light);
    y -= h + GAP;
  }

  // ---- verdict ----
  {
    const rag = b.verdictRag || "amber", rc = RAG[rag];
    const pad = 14 * k, d = 30 * k, labS = 30 * k, whyS = 9 * k;
    const whyLines = wrap(b.verdictReason, mono, whyS, CW - 2 * pad - 8 * k);
    const rowH = Math.max(d, labS * 0.9);
    const h = pad + rowH + 10 * k + whyLines.length * lh(whyS, 1.5) + pad - 4 * k;
    fit(h);
    rect(M, y, CW, h, mix(C.white, rc, 0.07), { borderColor: mix(C.rule, rc, 0.35), borderWidth: 0.6 });
    rect(M, y, 7 * k, h, rc);
    const cx = M + 7 * k + pad + d / 2, cy = y - pad - rowH / 2;
    P((p) => p.drawCircle({ x: cx, y: cy, size: d / 2, color: rc }));
    icon(rag === "green" ? "check" : rag === "red" ? "x" : "bang", cx, cy, d * 0.55, C.white, 3);
    const tx = M + 7 * k + pad + d + 12 * k;
    // One line: "ELLIE JR.'S VERDICT: PASS", the verdict in its RAG colour.
    const lead = "ELLIE JR.'S VERDICT: ", vtxt = String(b.verdict).toUpperCase();
    const room = M + CW - pad - tx, need = lg.widthOfTextAtSize(lead + vtxt, labS);
    const vS = need > room ? labS * (room / need) : labS, base = cy - vS * 0.3;
    text(lead, tx, base, vS, lg, C.ink);
    text(vtxt, tx + lg.widthOfTextAtSize(lead, vS), base, vS, lg, rc);
    let yy = y - pad - rowH - 10 * k;
    for (const l of whyLines) { yy -= whyS * 1.15; text(l, M + 7 * k + pad, yy, whyS, mono, C.ink); yy -= whyS * 0.35; }
    y -= h + GAP;
  }

  // ---- the three numbers that matter (black band) ----
  if (b.numbers.length) {
    const pad = 18 * k, titleS = 24 * k, colGap = 18 * k, n = b.numbers.length;
    const cw = (CW - 2 * pad - colGap * (n - 1)) / n;
    const valS = 42 * k, labS = 6.5 * k, bodyS = 7.4 * k, stag = 14 * k;
    const cols = b.numbers.map((num, i) => {
      const lab = wrap(String(num.label).toUpperCase(), monoB, labS, cw);
      const body = wrap(num.body, mono, bodyS, cw);
      const hh = (num.score ? 15 * k + 11 * k : 0) + valS * 0.92 + 8 * k + lab.length * lh(labS, 1.45) + 3 * k + body.length * lh(bodyS, 1.5);
      return { num, lab, body, off: i * stag, hh };
    });
    const h = pad + titleS * 0.9 + 14 * k + Math.max(...cols.map((c) => c.off + c.hh)) + pad;
    fit(h);
    rect(M, y, CW, h, C.black);
    const tA = "THE THREE NUMBERS ", tB = "THAT MATTER";
    text(tA, M + pad, y - pad - titleS * 0.75, titleS, lg, C.white);
    text(tB, M + pad + lg.widthOfTextAtSize(tA, titleS), y - pad - titleS * 0.75, titleS, lg, C.dim);
    const top0 = y - pad - titleS * 0.9 - 14 * k;
    cols.forEach((c, i) => {
      const x = M + pad + i * (cw + colGap);
      let yy = top0 - c.off;
      if (c.num.score) {
        const segs = 20, g = 2 * k, sw = (cw - g * (segs - 1)) / segs, on = Math.max(1, Math.round(c.num.score.fill * segs));
        for (let s = 0; s < segs; s++) round(x + s * (sw + g), yy, sw, 15 * k, Math.min(2.2 * k, sw / 2), { color: s < on ? BAR[c.num.score.rag] : C.seg });
        yy -= 15 * k + 7 * k;
        text("WEAK", x, yy, 5 * k, mono, C.dim, { characterSpacing: 0.6 * k });
        text("STRONG", x + cw - mono.widthOfTextAtSize("STRONG", 5 * k) - 6 * 0.6 * k, yy, 5 * k, mono, C.dim, { characterSpacing: 0.6 * k });
        yy -= 4 * k;
      }
      const [big, unit] = splitUnit(c.num.value);
      yy -= valS * 0.78;
      text(big, x, yy, valS, lg, C.white);
      if (unit) text(unit, x + lg.widthOfTextAtSize(big, valS) + 2 * k, yy, valS * 0.42, lg, hex("#cfcac6"));
      yy -= valS * 0.14 + 8 * k;
      for (const l of c.lab) { yy -= labS * 1.1; text(l, x, yy, labS, monoB, C.lighter, { characterSpacing: 0.3 * k }); yy -= labS * 0.35; }
      yy -= 3 * k;
      for (const l of c.body) { yy -= bodyS * 1.15; text(l, x, yy, bodyS, mono, C.light); yy -= bodyS * 0.35; }
    });
    y -= h + GAP;
  }

  // card shell + heading for the white sections
  const card = (h, title, small) => {
    fit(h);
    rect(M, y, CW, h, C.panel, { borderColor: C.rule, borderWidth: 0.6 });
    const ts2 = 19 * k;
    text(title, M + 16 * k, y - 14 * k - ts2 * 0.75, ts2, lg, C.ink);
    if (small) text(small, M + 16 * k + lg.widthOfTextAtSize(title, ts2) + 8 * k, y - 14 * k - ts2 * 0.75 + 1, 5.8 * k, mono, C.muted, { characterSpacing: 0.9 * k });
    return y - 14 * k - ts2 * 0.9 - 9 * k;
  };

  // ---- red flags ----
  if (b.flags.length) {
    const pad = 16 * k, iw = CW - 2 * pad, tx = 32 * k, tw = iw - tx - 10 * k, tS = 8 * k, bS = 7.4 * k, cS = 6.8 * k;
    const rows = b.flags.map((f) => {
      const body = wrap(f.body, mono, bS, tw);
      const check = f.check ? wrap(f.check, mono, cS, tw - 34 * k) : [];
      const hh = 8 * k + (f.title ? lh(tS, 1.35) : 0) + body.length * lh(bS, 1.45) + (check.length ? 4 * k + check.length * lh(cS, 1.45) : 0) + 7 * k;
      return { f, body, check, hh };
    });
    const h = 14 * k + 19 * k * 0.9 + 9 * k + rows.reduce((a, r) => a + r.hh + 5 * k, 0) + pad - 5 * k;
    let yy = card(h, "RED FLAGS");
    for (const r of rows) {
      const red = RAG.red;
      rect(M + pad, yy, iw, r.hh, mix(C.white, red, 0.04), { borderColor: mix(C.rule, red, 0.3), borderWidth: 0.6 });
      rect(M + pad, yy, 3.5 * k, r.hh, red);
      const d = 17 * k, cx = M + pad + 8 * k + d / 2 + 2 * k, cy = yy - 8 * k - d / 2 + 2 * k;
      P((p) => p.drawCircle({ x: cx, y: cy, size: d / 2, color: red }));
      icon("x", cx, cy, d * 0.55, C.white, 3.4);
      let ty = yy - 8 * k;
      if (r.f.title) { ty -= tS * 1.05; text(r.f.title, M + pad + tx, ty, tS, monoB, C.ink); ty -= tS * 0.3; }
      for (const l of r.body) { ty -= bS * 1.15; text(l, M + pad + tx, ty, bS, mono, C.ink); ty -= bS * 0.3; }
      if (r.check.length) {
        ty -= 4 * k;
        const tagW = mono.widthOfTextAtSize("CHECK", 5.2 * k) + 3.2 * k + 8 * k;
        r.check.forEach((l, i) => {
          ty -= cS * 1.15;
          if (i === 0) { round(M + pad + tx, ty + cS * 0.95, tagW, cS * 1.45, 1.8 * k, { borderColor: C.muted, borderWidth: 0.5 }); text("CHECK", M + pad + tx + 4 * k, ty + 0.6 * k, 5.2 * k, mono, C.muted, { characterSpacing: 0.8 * k }); }
          text(l, M + pad + tx + tagW + 6 * k, ty, cS, mono, C.muted);
          ty -= cS * 0.3;
        });
      }
      yy -= r.hh + 5 * k;
    }
    y -= h + GAP;
  }

  // ---- the deal in numbers: the other KPI tiles (black band) ----
  if (b.kpis.length) {
    const pad = 18 * k, titleS = 20 * k, iw = CW - 2 * pad, kH = 40 * k;
    const h = pad + titleS * 0.9 + 12 * k + kH + pad;
    fit(h);
    rect(M, y, CW, h, C.black);
    const tA = "THE DEAL ", tB = "IN NUMBERS";
    text(tA, M + pad, y - pad - titleS * 0.75, titleS, lg, C.white);
    text(tB, M + pad + lg.widthOfTextAtSize(tA, titleS), y - pad - titleS * 0.75, titleS, lg, C.dim);
    const yy = y - pad - titleS * 0.9 - 12 * k;
    const n = b.kpis.length, tw = iw / n;
    rect(M + pad, yy, iw, kH, C.tileLine);
    b.kpis.forEach(([kk, v], i) => {
      const x = M + pad + i * tw;
      rect(x + 0.5, yy - 0.5, tw - 1, kH - 1, C.tile);
      rect(x + 0.5, yy - 0.5, tw - 1, 2.5 * k, C.orange);
      text(String(kk).toUpperCase(), x + 8 * k, yy - 14 * k, 6.2 * k, mono, C.light, { characterSpacing: 0.5 * k });
      text(v, x + 8 * k, yy - 33 * k, 21 * k, lg, C.white);
    });
    y -= h + GAP;
  }

  // ---- questions for the broker (question cards) ----
  if (b.questions.length) {
    const pad = 16 * k, iw = CW - 2 * pad, cg = 12 * k, cw = (iw - cg) / 2, qS = 7.4 * k, inL = 40 * k;
    const cards = b.questions.map((q) => ({ q, lines: wrap(q, mono, qS, cw - inL - 10 * k) }));
    const cardH = (c) => 13 * k + 14 * k * 0.85 + 4 * k + c.lines.length * lh(qS, 1.45) + 10 * k;
    const rowsH = [];
    for (let i = 0; i < cards.length; i += 2) rowsH.push(Math.max(cardH(cards[i]), cards[i + 1] ? cardH(cards[i + 1]) : 0));
    const rowGap = 16 * k;
    const h = 14 * k + 19 * k * 0.9 + 9 * k + 10 * k + rowsH.reduce((a, r) => a + r + rowGap, 0) - rowGap + pad;
    let yy = card(h, "QUESTIONS FOR THE BROKER") - 10 * k;
    rowsH.forEach((rh, ri) => {
      [cards[ri * 2], cards[ri * 2 + 1]].forEach((c, j) => {
        if (!c) return;
        const x = M + pad + j * (cw + cg), idx = ri * 2 + j + 1;
        round(x, yy, cw, rh, 10 * k, { borderColor: C.orange, borderWidth: 2.4 * k });
        const qs = 36 * k, qw = lg.widthOfTextAtSize("?", qs);
        rect(x + 9 * k, yy + 3 * k, qw + 6 * k, 8 * k, C.panel);
        text("?", x + 12 * k, yy - qs * 0.62, qs, lg, C.orange);
        let ty = yy - 13 * k - 14 * k * 0.72;
        text(`QUESTION ${idx}`, x + inL, ty, 14 * k, lg, C.orange);
        ty -= 14 * k * 0.13 + 4 * k;
        for (const l of c.lines) { ty -= qS * 1.15; text(l, x + inL, ty, qS, mono, C.ink); ty -= qS * 0.3; }
      });
      yy -= rh + rowGap;
    });
    y -= h + GAP;
  }

  // ---- data room request (checklist) ----
  if (b.dataroom.length) {
    const pad = 16 * k, iw = CW - 2 * pad, cg = 18 * k, cw = (iw - cg) / 2, dS = 7.4 * k;
    const items = b.dataroom.map((d) => wrap(d, mono, dS, cw - 18 * k));
    const rowsH = [];
    for (let i = 0; i < items.length; i += 2) rowsH.push(Math.max(items[i].length, items[i + 1] ? items[i + 1].length : 0) * lh(dS, 1.45) + 11 * k);
    const h = 14 * k + 19 * k * 0.9 + 9 * k + rowsH.reduce((a, r) => a + r, 0) + pad - 6 * k;
    let yy = card(h, "DATA ROOM REQUEST");
    rowsH.forEach((rh, ri) => {
      [items[ri * 2], items[ri * 2 + 1]].forEach((lines, j) => {
        if (!lines) return;
        const x = M + pad + j * (cw + cg);
        icon("doc", x + 5 * k, yy - 5 * k - dS * 0.55, 10 * k, C.orange, 2.2);
        let ty = yy - 5 * k;
        for (const l of lines) { ty -= dS * 1.15; text(l, x + 16 * k, ty, dS, mono, C.ink); ty -= dS * 0.3; }
        P((p) => p.drawLine({ start: { x, y: yy - rh + 1 }, end: { x: x + cw, y: yy - rh + 1 }, thickness: 0.5, color: C.rule }));
      });
      yy -= rh;
    });
    y -= h + GAP;
  }

  // ---- what would change my mind (orange callout) ----
  if (b.mind) {
    const pad = 14 * k, d = 26 * k, tx = pad + d + 12 * k, mS = 8.4 * k;
    const lines = wrap(b.mind, mono, mS, CW - tx - pad);
    const h = pad + 18 * k * 0.9 + 6 * k + lines.length * lh(mS, 1.5) + pad - 2 * k;
    fit(h);
    rect(M, y, CW, h, C.orangeTint, { borderColor: C.orange, borderWidth: 0.8 });
    const cx = M + pad + d / 2, cy = y - pad - d / 2;
    P((p) => p.drawCircle({ x: cx, y: cy, size: d / 2, color: C.orange }));
    icon("bulb", cx, cy, d * 0.6, C.white, 2.2);
    text("WHAT WOULD CHANGE MY MIND", M + tx, y - pad - 18 * k * 0.75, 18 * k, lg, C.ink);
    let ty = y - pad - 18 * k * 0.9 - 6 * k;
    for (const l of lines) { ty -= mS * 1.15; text(l, M + tx, ty, mS, mono, C.ink); ty -= mS * 0.35; }
    y -= h + GAP;
  }

  // ---- footer on every page ----
  if (!dry) {
    const logoH = 12, logoW = (ctx.logo.width / ctx.logo.height) * logoH;
    doc.getPages().forEach((pg, i, all) => {
      pg.drawImage(ctx.logo, { x: W - M - logoW, y: 13, width: logoW, height: logoH });
      pg.drawText("Prepared with Fifth Dimension Deal Screen. A first pass for your team to check, not advice.", { x: M, y: 18, size: 7, font: mono, color: C.muted });
      if (all.length > 1) { const t = `Page ${i + 1} of ${all.length}`; pg.drawText(t, { x: W - M - logoW - 16 - mono.widthOfTextAtSize(t, 7), y: 18, size: 7, font: mono, color: C.muted }); }
    });
  }
  return pages;
}

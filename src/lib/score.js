// Strength of a headline metric for the report's segmented bars, shared by the results page and the PDF.
// fill: position on a fixed weak→strong scale (0–1). rag: same thresholds as the numbers grid.
const clamp = (x) => Math.min(1, Math.max(0, x));
const rag = (v, g, a, lowerBetter) => (lowerBetter ? (v <= g ? "green" : v <= a ? "amber" : "red") : v >= g ? "green" : v >= a ? "amber" : "red");

export function scoreMetric(label, M) {
  if (!M) return null;
  const l = String(label).toLowerCase();
  if (/irr/.test(l) && isFinite(M.irr)) return { fill: clamp((M.irr + 0.1) / 0.35), rag: rag(M.irr, 0.15, 0.1) };
  if (/leverage spread|spread/.test(l)) return { fill: clamp((M.spread + 0.03) / 0.06), rag: rag(M.spread, 0.005, 0) };
  if (/dscr/.test(l)) return isFinite(M.dscr) ? { fill: clamp((M.dscr - 0.8) / 1.2), rag: rag(M.dscr, 1.35, 1.2) } : { fill: 1, rag: "green" };
  if (/exit cap/.test(l)) return { fill: clamp((M.exitSpread + 0.005) / 0.015), rag: rag(M.exitSpread, 0.0025, 0) };
  if (/debt yield/.test(l) && isFinite(M.dy)) return { fill: clamp((M.dy - 0.05) / 0.1), rag: rag(M.dy, 0.09, 0.075) };
  if (/multiple/.test(l)) return { fill: clamp((M.em - 0.5) / 1.5), rag: rag(M.em, 1.6, 1.3) };
  if (/breakeven/.test(l)) return { fill: clamp((1 - M.beo) / 0.4), rag: rag(M.beo, 0.8, 0.88, true) };
  return null;
}

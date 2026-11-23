// Deterministic deal arithmetic, unchanged from the prototype.
// Assumes 2% closing and 2% sale costs; capex funded from equity in year 1; IRR on annual cash flows.

export function annualDS(loan, rate, amort) {
  if (!loan) return 0;
  const r = rate / 100;
  if (!amort) return loan * r;
  const m = r / 12, n = amort * 12;
  return (loan * m) / (1 - Math.pow(1 + m, -n)) * 12;
}

export function balance(loan, rate, amort, years) {
  if (!amort) return loan;
  const m = rate / 100 / 12, n = amort * 12;
  const p = (loan * m) / (1 - Math.pow(1 + m, -n));
  const k = years * 12;
  return loan * Math.pow(1 + m, k) - (p * (Math.pow(1 + m, k) - 1)) / m;
}

export function irr(cfs) {
  let lo = -0.99, hi = 1.5;
  const npv = (r) => cfs.reduce((s, c, i) => s + c / Math.pow(1 + r, i), 0);
  if (npv(lo) * npv(hi) > 0) return NaN;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function model(d, g, exitcap) {
  const loan = (d.price * d.ltv) / 100;
  const ds = annualDS(loan, d.rate, d.amort);
  const equity = d.price * 1.02 - loan + (d.capex || 0);
  const cfs = [-equity];
  let sumCF = 0;
  for (let t = 1; t <= d.hold; t++) {
    const noi = d.noi * Math.pow(1 + g / 100, t - 1);
    let cf = noi - ds;
    if (t === d.hold) {
      const exitNOI = d.noi * Math.pow(1 + g / 100, d.hold);
      const sale = (exitNOI / (exitcap / 100)) * 0.98;
      cf += sale - balance(loan, d.rate, d.amort, d.hold);
    }
    cfs.push(cf);
    sumCF += cf;
  }
  return { loan, ds, equity, irr: irr(cfs), em: sumCF / equity };
}

export function calc(d) {
  const ok = d.price > 0 && d.noi > 0 && d.hold > 0 && d.exitcap > 0 && isFinite(d.ltv) && isFinite(d.rate);
  if (!ok) return null;
  const cap = d.noi / d.price;
  const base = model(d, d.growth, d.exitcap);
  const loanConst = base.loan ? base.ds / base.loan : 0;
  const egi = d.noi / (1 - (d.opex || 0) / 100);
  const gpr = egi / ((d.occ || 100) / 100);
  const opexAmt = (egi * (d.opex || 0)) / 100;
  return {
    cap,
    per: d.size ? d.price / d.size : NaN,
    loan: base.loan,
    ds: base.ds,
    dscr: base.ds ? d.noi / base.ds : Infinity,
    dy: base.loan ? d.noi / base.loan : Infinity,
    beo: (opexAmt + base.ds) / gpr,
    spread: cap - loanConst,
    loanConst,
    equity: base.equity,
    irr: base.irr,
    em: base.em,
    exitSpread: d.exitcap / 100 - cap,
  };
}

export const sym = (c) => (c === "SGD" ? "S$" : c === "GBP" ? "£" : "$");

export function money(x, c) {
  if (!isFinite(x)) return "–";
  const a = Math.abs(x), s = sym(c);
  if (a >= 1e9) return s + (x / 1e9).toFixed(2) + "bn";
  if (a >= 1e6) return s + (x / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return s + Math.round(x / 1e3) + "k";
  return s + Math.round(x);
}

export const pct = (x, dp = 1) => (isFinite(x) ? (x * 100).toFixed(dp) + "%" : "–");
export const bps = (x) => (isFinite(x) ? (x >= 0 ? "+" : "") + Math.round(x * 1e4) + " bps" : "–");

export function perUnit(D, M) {
  if (!isFinite(M.per)) return "–";
  return D.unit === "sq ft" ? sym(D.ccy) + M.per.toFixed(0) : money(M.per, D.ccy);
}

// The facts block Ellie reads. Sent to the server, which wraps it in a fixed prompt.
export function facts(D, M) {
  const c = D.ccy;
  return [
    `Deal: ${D.name || "(unnamed)"} | ${D.asset} | ${D.market || "market not given"}`,
    `Size: ${D.size || "?"} ${D.unit} | Price: ${money(D.price, c)} | Price per ${D.unit}: ${isFinite(M.per) ? perUnit(D, M) : "?"}`,
    `In-place NOI: ${money(D.noi, c)} | Going-in cap: ${pct(M.cap, 2)} | Occupancy: ${D.occ}% | Opex ratio: ${D.opex}% | Capex budget: ${money(D.capex || 0, c)}`,
    `Debt: ${D.ltv}% LTV, loan ${money(M.loan, c)}, ${D.rate}% rate, ${D.amort ? D.amort + "-yr amortisation" : "interest-only"} | Annual debt service ${money(M.ds, c)} | Loan constant ${pct(M.loanConst, 2)}`,
    `DSCR ${isFinite(M.dscr) ? M.dscr.toFixed(2) + "x" : "n/a"} | Debt yield ${pct(M.dy, 1)} | Leverage spread (cap minus loan constant) ${bps(M.spread)} | Breakeven occupancy ${pct(M.beo, 0)}`,
    `Hold ${D.hold} yrs | NOI growth ${D.growth}%/yr | Exit cap ${D.exitcap}% (${bps(M.exitSpread)} vs entry) | Equity cheque ${money(M.equity, c)} | Levered IRR ${isFinite(M.irr) ? pct(M.irr, 1) : "n/m"} | Equity multiple ${M.em.toFixed(2)}x`,
    `Business plan: ${D.plan || "(not given)"}`,
    `OM notes: ${D.om || "(none)"}`,
  ].join("\n");
}

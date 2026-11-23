import React, { useEffect, useMemo, useRef, useState } from "react";
import { EXAMPLES, EXAMPLE_OPTIONS, FIELDS, NUMERIC, ASSETS, CCYS, UNITS, SOLO_URL } from "./data.js";
import { calc, model, money, pct, bps, sym, perUnit, facts } from "./lib/finance.js";
import { md } from "./lib/markdown.js";
import { askEllie, fileToImage } from "./lib/ellie.js";
import { SAMPLE_BRIEFS } from "./sampleBriefs.js";
import { pdfToText } from "./lib/pdfText.js";
import Report from "./Report.jsx";
import { scoreMetric } from "./lib/score.js";

const AI_IDLE = "Ellie Jr. reads the numbers above plus your notes, then writes what a good senior analyst would put in front of IC.";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Shown while Ellie Jr. reads a pasted listing or uploaded brochure, then lists what she filled in.
function ReadingPanel({ r }) {
  const done = r.phase === "done";
  return (
    <div className={"read-card" + (done ? " done" : "")} role="status" aria-live="polite">
      <div className="read-ava"><img src="/ellie.webp" alt="" width="44" height="44" />{done && <span className="read-tick" aria-hidden="true">✓</span>}</div>
      <div className="read-body">
        {done ? (
          <>
            <div className="read-title">Ellie Jr. read the document and filled {r.filled.length} field{r.filled.length === 1 ? "" : "s"}</div>
            <div className="read-chips">{r.filled.map((f, i) => <span key={f} style={{ animationDelay: i * 110 + "ms" }}>✓ {f}</span>)}</div>
            <div className="read-hint">{r.missing.length ? "Still needed: " + r.missing.join(", ") + ". " : ""}Check the details below.</div>
          </>
        ) : (
          <>
            <div className="read-title">Ellie Jr. is reading<span className="read-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></div>
            <div className="read-step" key={r.step}>{r.step}</div>
          </>
        )}
        <div className="read-bar"><i style={{ width: Math.round((r.progress || 0) * 100) + "%" }} /></div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function parseVals(v) {
  const o = {};
  FIELDS.forEach((f) => {
    o[f] = NUMERIC.has(f) ? parseFloat(String(v[f] ?? "")) : String(v[f] ?? "").trim();
  });
  return o;
}

function missingCore(D) {
  const miss = [];
  if (!isFinite(D.price)) miss.push("purchase price");
  if (!isFinite(D.noi)) miss.push("NOI");
  if (!isFinite(D.hold)) miss.push("hold");
  if (!isFinite(D.exitcap)) miss.push("exit cap");
  return miss.length ? miss.join(", ") : "a few details";
}

function errorMessage(e, fallback) {
  const code = e && e.code;
  if (code === "not_configured") return "The AI isn't switched on for this site yet (no API key set). The numbers still work.";
  if (code === "rate_limited") return "Too many runs in a row. Wait a minute and try again.";
  if (code === "network") return "Couldn't reach Ellie Jr. Check your connection and try again.";
  return fallback;
}

export default function DealScreen() {
  const [example, setExample] = useState("blank");
  const [vals, setVals] = useState(EXAMPLES.blank);
  const [inputsOpen, setInputsOpen] = useState(false);
  const staleRef = useRef(false);
  const [tags, setTags] = useState({});

  const [tz, setTz] = useState("");
  const [tzStatus, setTzStatus] = useState("");
  // Live "Ellie Jr. is reading" panel: { phase: "reading" | "done", step, progress, filled[], missing[] }
  const [read, setRead] = useState(null);
  const [tzBusy, setTzBusy] = useState(false);
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");

  const [aiText, setAiText] = useState("");
  const [aiRan, setAiRan] = useState(false);
  const [aiStatus, setAiStatus] = useState(AI_IDLE);
  const [running, setRunning] = useState(false);
  const [soloBtn, setSoloBtn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [screen, setScreen] = useState("deal"); // "deal" = steps 1-3, "results" = Ellie's report
  const ctrlRef = useRef(null);
  const soloShownRef = useRef(false);
  const soloRef = useRef(null);

  const [leadDone, setLeadDone] = useState(false);
  const [lName, setLName] = useState("");
  const [lEmail, setLEmail] = useState("");
  const [lStatus, setLStatus] = useState("");
  const [lBusy, setLBusy] = useState(false);
  const [lTrap, setLTrap] = useState(""); // honeypot: hidden from people, bots fill it in
  const [mailStatus, setMailStatus] = useState("");

  const nameRef = useRef(null);
  const aiRef = useRef(null);

  const D = useMemo(() => parseVals(vals), [vals]);
  const M = useMemo(() => calc(D), [D]);

  // ---------- one screen: the numbers appear under the deal as soon as there is enough to calculate ----------
  useEffect(() => {
    // Old /numbers links, and /results opened cold (nothing to show yet), land on the deal page.
    const p = window.location.pathname.replace(/\/+$/, "");
    if (p === "/numbers" || p === "/results") { try { window.history.replaceState(null, "", "/" + window.location.search); } catch {} }
    const onPop = () => setScreen(window.location.pathname.replace(/\/+$/, "") === "/results" ? "results" : "deal");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function openResults() {
    setScreen("results");
    try { if (window.location.pathname !== "/results") window.history.pushState({ s: "results" }, "", "/results" + window.location.search); } catch {}
    window.scrollTo(0, 0);
  }
  function backToDeal() {
    if (window.history.state && window.history.state.s === "results") { window.history.back(); return; }
    setScreen("deal");
    try { window.history.replaceState(null, "", "/" + window.location.search); } catch {}
  }
  // "Screen another deal": back to step 1 with nothing selected (the visitor's name and email are kept).
  function screenAnother() {
    if (ctrlRef.current) { try { ctrlRef.current.abort(); } catch {} }
    freshRef.current = true;
    staleRef.current = false;
    setExample("blank");
    setVals({ ...EXAMPLES.blank });
    setTags({});
    setInputsOpen(false);
    setTz("");
    setTzStatus("");
    setRead(null);
    setTzBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    setFileName("");
    clearAI();
    setRunning(false);
    setCopied(false);
    setMailStatus("");
    setScreen("deal");
    try { window.history.replaceState(null, "", "/" + window.location.search); } catch {}
    window.scrollTo(0, 0);
  }
  // Solo pop-up: once per visit, 20 seconds after the user lands on the results (cancelled if they leave first).
  useEffect(() => {
    if (screen !== "results" || soloShownRef.current) return;
    const t = setTimeout(() => { if (!soloShownRef.current) { soloShownRef.current = true; openSolo(); } }, 20000);
    return () => clearTimeout(t);
  }, [screen]);

  const freshRef = useRef(false);
  useEffect(() => {
    if (freshRef.current) { freshRef.current = false; return; }
    if (screen === "deal" && leadDone) setTimeout(() => aiRef.current && aiRef.current.scrollIntoView({ block: "start" }), 0);
  }, [screen]);

  // After sample data or Ellie fills the deal, bring the numbers into view.
  const numbersRef = useRef(null);
  const autoNumbersRef = useRef(false);
  const sampleRef = useRef(null);
  useEffect(() => {
    if (!autoNumbersRef.current) return;
    autoNumbersRef.current = false;
    if (M && numbersRef.current) setTimeout(() => numbersRef.current && numbersRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, [M, vals]);

  // ---------- form ----------
  function clearAI() {
    setAiText("");
    setAiRan(false);
    setAiStatus(AI_IDLE);
  }

  function loadExample(k) {
    setExample(k);
    setVals({ ...EXAMPLES[k] });
    setTags({});
    clearAI();
  }

  function loadSample() {
    loadExample("aus");
    setTz("");
    setRead(null);
    if (fileRef.current) fileRef.current.value = "";
    setFileName("");
    setInputsOpen(true);
    setTzStatus("Sample deal loaded: a 312-unit multifamily in Austin. Pick a different sample deal below, or scroll down for the numbers.");
    // Stay here so the user can choose a sample deal; bring the picker into view instead of jumping to the numbers.
    setTimeout(() => { const el = sampleRef.current; if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({ preventScroll: true }); } }, 60);
  }

  // Manual entry starts from a blank deal, unless Ellie has already filled it from a listing.
  function openManual() {
    // Always opens (never closes) the deal-info form, starting blank unless Ellie filled it from a listing.
    if (example !== "blank") { loadExample("blank"); setTzStatus(""); setRead(null); }
    setInputsOpen(true);
    setTimeout(() => { const el = document.getElementById("deal-inputs"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  }

  function setField(id, value) {
    setVals((v) => ({ ...v, [id]: value }));
    setTags((t) => (t[id] && t[id].cls !== "you" ? { ...t, [id]: { text: "Edited by you", cls: "you" } } : t));
    if (aiRan) { staleRef.current = true; setAiStatus("Inputs changed since the last run. Run the first pass again to refresh it."); }
  }

  const field = (id, label, input, full) => (
    <label className={full ? "full" : undefined} key={id}>
      {label}
      {input}
      {tags[id] && <span className={"src" + (tags[id].cls ? " " + tags[id].cls : "")}>{tags[id].text}</span>}
    </label>
  );
  const num = (id, step = "any") => (
    <input id={id} type="number" step={step} value={String(vals[id] ?? "")} onChange={(e) => setField(id, e.target.value)} />
  );
  const text = (id) => <input id={id} value={String(vals[id] ?? "")} onChange={(e) => setField(id, e.target.value)} />;
  const select = (id, options) => (
    <select id={id} value={vals[id]} onChange={(e) => setField(id, e.target.value)}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  // ---------- teaser ----------
  // Runs automatically when a listing is pasted or a file is chosen (no button).
  async function fillFromTeaser({ text = "", file = null } = {}) {
    if (tzBusy) return;
    const t = file ? "" : text.trim();
    if (!t && !file) return;
    let image = null, docText = "";
    setTzBusy(true);
    setTzStatus("");
    setRead({ phase: "reading", step: file ? "Opening " + (file.name || "the document") + "…" : "Reading the listing…", progress: 0.06 });
    if (file) {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
      try {
        if (isPdf) {
          if (file.size > 50 * 1024 * 1024) throw { code: "too_big_pdf" };
          // Read the text here in the browser; only fall back to sending the file for scanned PDFs with no text.
          const { text: pt } = await pdfToText(file, (i, n) => setRead((r) => r && r.phase === "reading" ? { ...r, step: `Reading page ${i} of ${n}…`, progress: 0.06 + (i / n) * 0.34 } : r));
          if (pt.replace(/--- page \d+ ---/g, "").trim().length > 400) docText = pt;
          else image = await fileToImage(file);
        } else image = await fileToImage(file);
      } catch (e) {
        setTzBusy(false);
        setRead(null);
        setTzStatus(e && e.code === "too_big_pdf" ? "That PDF is over 50 MB. Try a smaller file, or paste the text."
          : e && e.code === "too_big" ? "That file is over 3 MB. Try a smaller image, a PDF with selectable text, or paste the text."
          : "Couldn't open that file. Paste the text instead.");
        return;
      }
    }
    // While Ellie Jr. works: step through what she is looking for, and ease the bar towards the end.
    const STEPS = ["Finding the price and size…", "Looking for income and occupancy…", "Checking rents and lease terms…", "Noting risks the broker mentions…", "Filling in the deal fields…"];
    let si = 0;
    setRead((r) => ({ ...r, step: STEPS[0], progress: Math.max(r?.progress || 0, 0.42) }));
    const tick = setInterval(() => {
      si = Math.min(si + 1, STEPS.length - 1);
      setRead((r) => r && r.phase === "reading" ? { ...r, step: STEPS[si], progress: r.progress + (0.94 - r.progress) * 0.18 } : r);
    }, 1500);
    try {
      const res = await askEllie({ task: "extract", text: docText || t, image: docText ? null : image });
      const m = (res.text || "").match(/\{[\s\S]*\}/);
      if (!m) throw { code: "parse" };
      const { filled, missing } = applyTeaser(JSON.parse(m[0]));
      setRead({ phase: "done", progress: 1, filled, missing });
    } catch (e) {
      setRead(null);
      setTzStatus(errorMessage(e, "Ellie Jr. couldn't read that one. Try pasting the text, or type the numbers in."));
    } finally {
      clearInterval(tick);
      setTzBusy(false);
    }
  }

  function applyTeaser(x) {
    const nv = { ...vals };
    const nt = {};
    const v = (k) => { const o = x[k]; const val = o && typeof o === "object" ? o.value : o; return val === null || val === undefined || val === "" ? null : val; };
    const q = (k) => (x[k] && x[k].source ? "“" + String(x[k].source).slice(0, 90) + "”" : "the document");
    const numv = (k) => { const a = v(k); if (a === null) return NaN; return typeof a === "number" ? a : parseFloat(String(a).replace(/[^0-9.\-]/g, "")); };
    const LABEL = { name: "Deal name", market: "Market", asset: "Asset type", size: "Size", price: "Price", occ: "Occupancy", noi: "NOI" };
    const filled = [], missing = [];
    const from = (k) => { filled.push(LABEL[k] || k); return { text: x[k] && x[k].source ? "From the document: " + q(k) : "From the document", cls: "" }; };
    const miss = (id, msg) => { nv[id] = ""; nt[id] = { text: msg || "Not in the document: add it", cls: "miss" }; missing.push(LABEL[id] || id); };
    let found = 0;

    ["name", "market"].forEach((k) => { const a = v(k); if (a !== null) { nv[k] = String(a); nt[k] = from(k); found++; } else miss(k); });
    const asset = v("asset"); if (ASSETS.includes(asset)) { nv.asset = asset; nt.asset = from("asset"); found++; }
    const ccy = v("ccy"); if (CCYS.includes(ccy)) nv.ccy = ccy;
    const unit = v("unit"); if (UNITS.includes(unit)) nv.unit = unit;
    ["size", "price", "occ"].forEach((k) => { const a = numv(k); if (isFinite(a)) { nv[k] = a; nt[k] = from(k); found++; } else miss(k); });
    const noi = numv("noi"), cap = numv("cap"), price = parseFloat(nv.price);
    if (isFinite(noi)) { nv.noi = noi; nt.noi = from("noi"); found++; }
    else if (isFinite(cap) && isFinite(price)) { nv.noi = Math.round((price * cap) / 100); nt.noi = { text: "Worked out: " + cap + "% cap rate × price, from " + q("cap"), cls: "" }; filled.push("NOI (from cap rate)"); found++; }
    else miss("noi", "Not in the document: add NOI or a cap rate");
    const plan = v("plan"); if (plan) { nv.plan = String(plan); nt.plan = { text: "Summarised from the document", cls: "" }; } else nv.plan = "";
    const om = v("om"); if (om) { nv.om = Array.isArray(om) ? om.join(" ") : String(om); nt.om = { text: "Pulled from the document", cls: "" }; } else nv.om = "";
    ["opex", "capex", "ltv", "rate", "amort", "hold", "growth", "exitcap"].forEach((id) => { nt[id] = { text: "Your assumption", cls: "you" }; });
    // Listings rarely state an exit cap: default to going-in cap + 0.25% so the numbers can show straight away.
    const pNum = parseFloat(nv.price), nNum = parseFloat(nv.noi);
    if (!isFinite(parseFloat(nv.exitcap)) && pNum > 0 && isFinite(nNum)) {
      nv.exitcap = Math.round(((nNum / pNum) * 100 + 0.25) * 20) / 20;
      nt.exitcap = { text: "Assumed: going-in cap + 0.25%. Change it if you disagree", cls: "you" };
    }

    setVals(nv);
    setTags(nt);
    setExample("blank");
    clearAI();
    setInputsOpen(true);
    setTzStatus("");
    autoNumbersRef.current = true;
    return { filled, missing };
  }

  // ---------- AI first pass ----------
  function openSolo() {
    const d = soloRef.current;
    if (!d) return;
    if (d.showModal) { try { d.showModal(); return; } catch {} }
    d.setAttribute("open", "");
  }
  function closeSolo() {
    const d = soloRef.current;
    if (!d) return;
    if (d.close) { try { d.close(); return; } catch {} }
    d.removeAttribute("open");
  }

  async function runAI(fromLead = false) {
    if (!leadDone && !fromLead) {
      nameRef.current && nameRef.current.focus();
      return null;
    }
    if (!M) { setAiStatus("Add price, NOI, hold and exit cap first."); return null; }
    if (ctrlRef.current) ctrlRef.current.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setRunning(true);
    setAiText("");
    setAiStatus("Ellie Jr. is reading the deal…");
    const t0 = performance.now();
    // Sample deals, run unedited, use Ellie's prepared first pass (no live AI call needed).
    const sample = example !== "blank" && SAMPLE_BRIEFS[example] && EXAMPLES[example] && FIELDS.every((f) => String(vals[f] ?? "") === String(EXAMPLES[example][f] ?? ""));
    if (sample) {
      const full = SAMPLE_BRIEFS[example];
      try {
        for (let i = 0; i < full.length; i += 60) {
          if (ctrl.signal.aborted) return null;
          setAiText(full.slice(0, i));
          await new Promise((r) => setTimeout(r, 18));
        }
        setAiText(full);
        setAiRan(true);
        staleRef.current = false;
        setSoloBtn(true);
        setAiStatus("");
        return full;
      } finally {
        setRunning(false);
      }
    }
    try {
      const res = await askEllie({ task: "firstpass", facts: facts(D, M) }, { signal: ctrl.signal, onText: ({ text }) => setAiText(text) });
      setAiText(res.text);
      setAiRan(true);
      staleRef.current = false;
      setSoloBtn(true);
      setAiStatus("First pass done in " + Math.round((performance.now() - t0) / 1000) + "s. Check it before you rely on it.");
      return res.text;
    } catch (e) {
      if (e && e.name === "AbortError") return null;
      setAiStatus(errorMessage(e, "The first pass did not complete. Try once more."));
      if (e && e.text) setAiText(e.text);
      return null;
    } finally {
      setRunning(false);
    }
  }

  function brief() {
    return "IC FIRST PASS — " + (D.name || "Deal") + "\nPrepared with 5D Deal Screen · " + new Date().toISOString().slice(0, 10) +
      "\n\nTHE NUMBERS\n" + facts(D, M) + "\n\n" + aiText.replace(/^#+\s*/gm, "").trim() +
      "\n\nSensitivity, assumptions and method: 2% closing and sale costs; capex from equity in year 1; IRR on annual cash flows.";
  }
  async function copyBrief() {
    try { await navigator.clipboard.writeText(brief()); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setAiStatus("Copy was blocked by the browser. Select the text above and copy it."); }
  }

  // ---------- lead capture (mocked; production posts to HubSpot) ----------
  async function submitLead(ev) {
    ev.preventDefault();
    const name = lName.trim(), email = lEmail.trim();
    if (!name || !EMAIL_RE.test(email)) { setLStatus("Add your name and a work email."); return; }
    setLeadDone(true);
    setLBusy(true);
    setLStatus("");
    // Go straight to Ellie's results on their own screen.
    openResults();
    const out = await runAI(true);
    if (out) emailCopy(name, email, out);
    setLBusy(false);
  }

  // Email the follow-up (with the PDF) from the server; figures are recalculated there.
  async function emailCopy(name, email, text) {
    setMailStatus("");
    try {
      const r = await fetch("/api/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, vals, example, text, company: lTrap }) });
      if (r.ok) { setMailStatus(""); return; }
      const j = await r.json().catch(() => ({}));
      setMailStatus(j.code === "rate_limited" ? "We've sent a few copies already, so this one wasn't emailed. Try again later." : "We couldn't email a copy just now, but your analysis is below.");
    } catch {
      setMailStatus("We couldn't email a copy just now, but your analysis is below.");
    }
  }

  // ---------- render helpers ----------
  const tiles = M ? [
    ["Going-in cap", pct(M.cap, 2), money(D.noi, D.ccy) + " NOI", ""],
    ["Price / " + (D.unit === "sq ft" ? "sq ft" : D.unit.replace(/s$/, "")), perUnit(D, M), D.size ? D.size.toLocaleString() + " " + D.unit : "", ""],
    ["DSCR", isFinite(M.dscr) ? M.dscr.toFixed(2) + "x" : "no debt", "debt service " + money(M.ds, D.ccy), M.dscr >= 1.35 ? "good" : M.dscr >= 1.2 ? "warn" : "bad"],
    ["Debt yield", isFinite(M.dy) ? pct(M.dy, 1) : "–", "loan " + money(M.loan, D.ccy) + " (" + D.ltv + "% LTV)", M.dy >= 0.09 ? "good" : M.dy >= 0.075 ? "warn" : "bad"],
    ["Leverage spread", bps(M.spread), "cap less loan constant " + pct(M.loanConst, 2), M.spread >= 0.005 ? "good" : M.spread >= 0 ? "warn" : "bad"],
    ["Breakeven occupancy", pct(M.beo, 0), "vs " + (D.occ || 100) + "% in place", M.beo <= 0.8 ? "good" : M.beo <= 0.88 ? "warn" : "bad"],
    ["Exit vs entry cap", bps(M.exitSpread), "exit " + D.exitcap.toFixed(2) + "%", M.exitSpread >= 0.0025 ? "good" : M.exitSpread >= 0 ? "warn" : "bad"],
    ["Levered IRR", isFinite(M.irr) ? pct(M.irr, 1) : "n/m", D.hold + "-yr hold, " + M.em.toFixed(2) + "x equity", M.irr >= 0.15 ? "good" : M.irr >= 0.1 ? "warn" : "bad"],
    ["Equity cheque", money(M.equity, D.ccy), "incl. capex " + money(D.capex || 0, D.ccy), ""],
  ] : ["Going-in cap", "Price / unit", "DSCR", "Debt yield", "Leverage spread", "Breakeven occupancy", "Exit vs entry cap", "Levered IRR", "Equity cheque"].map((k) => [k, "—", "", "empty"]);

  const score = (label) => scoreMetric(label, M);

  const caps = M ? [-0.25, 0, 0.25, 0.5, 0.75].map((x) => D.exitcap + x) : [];
  const gs = M ? [D.growth - 2, D.growth, D.growth + 2] : [];

  return (
    <>
      {screen === "results" ? (
        <div className="results-page">
          <header className="top">
            <div className="brand">
              <h1>Deal Screen: A Senior analyst <span>on every deal</span></h1>
            </div>
            <img className="mark-top" src="/mark5d.webp" alt="5D" height="88" />
          </header>
          <main className="rp-main">
            <div className="rp-bar-top">
              <button type="button" className="rp-back" onClick={backToDeal}>← Back to the deal</button>
              <div className="rp-actions">
              <button type="button" className="ghost" onClick={screenAnother}>Screen another deal</button>
              <button type="button" className="ghost" disabled={!aiRan || running} onClick={copyBrief}>{copied ? "Copied ✓" : "Copy IC brief"}</button>
              <a className="btn-primary" href={SOLO_URL} target="_blank" rel="noopener">Go deeper in Solo</a>
              </div>
            </div>
            <section className="rp-deal" aria-label="The deal">
              <h1>{(D.name || "Your deal").split(" · ")[0]}</h1>
              <div className="rp-deal-meta">{[new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), D.asset, D.market, D.size ? D.size.toLocaleString() + " " + D.unit : ""].filter(Boolean).join(" · ")}</div>
              {M && (
                <div className="rp-kpis">
                  {[["Price", money(D.price, D.ccy), ""], ...tiles.filter(([k]) => ["Going-in cap", "DSCR", "Leverage spread", "Levered IRR"].includes(k)).map(([k, v, , c]) => [k, v, c]), ["Equity multiple", M.em.toFixed(2) + "x", M.em >= 1.6 ? "good" : M.em >= 1.3 ? "warn" : "bad"]].map(([k, v, c]) => (
                    <div className={"rp-kpi " + c} key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
                  ))}
                </div>
              )}
            </section>

            {mailStatus && <p className="rp-status rp-mail">{mailStatus}</p>}
            {!running && aiStatus && aiStatus !== AI_IDLE && <p className="rp-status">{aiStatus}</p>}

            <Report text={aiText} running={running} score={score} />

            <div className="rp-foot"><img src="/logo-ink.webp" alt="Fifth Dimension" height="20" /></div>
          </main>
        </div>
      ) : (
      <>
      <header className="top">
        <div className="brand">
          <h1>Deal Screen: A Senior analyst <span>on every deal</span></h1>
        </div>
        <img className="mark-top" src="/mark5d.webp" alt="5D" height="88" />
      </header>

      <main>
        <section>
          <div className="steps">
            {/* Who it's for and what it does */}
            <div className="step-row intro-row">
              <div className="step-n spacer" aria-hidden="true">00</div>
              <div className="intro">
                <p className="intro-who">Built for real estate investors, lenders, asset managers and brokers who need a fast, defensible first read on a deal.</p>
                <p className="intro-what">Enter the headline numbers and Ellie Jr. calculates the metrics that matter, flags the risks and tells you whether the deal is worth pursuing.</p>
              </div>
            </div>
            {/* STEP 1: enter the deal */}
            <div className="step-row">
            <div className="step-n" aria-hidden="true">01</div>
            <form id="deal" className="card step" autoComplete="off" noValidate onSubmit={(e) => e.preventDefault()}>
              <h2>Enter your deal</h2>
              <p className="lede">Simply paste a broker listing, upload a screenshot or enter the deal information below. No listing to hand? Use sample data.</p>
              <textarea id="tz" placeholder="Paste the listing or teaser text here" value={tz} disabled={tzBusy} onChange={(e) => setTz(e.target.value)}
                onPaste={(e) => { const p = e.clipboardData.getData("text"); if (!p.trim()) return; const el = e.currentTarget; const next = el.value.slice(0, el.selectionStart) + p + el.value.slice(el.selectionEnd); fillFromTeaser({ text: next }); }} />
              <div className="row upload-row">
                <label className="upload">Upload document/brochure
                  <input type="file" ref={fileRef} accept="application/pdf,image/png,image/jpeg,image/gif,image/webp"
                    onChange={() => { const f = fileRef.current.files[0]; setFileName(f ? f.name : ""); if (f) fillFromTeaser({ file: f }); fileRef.current.value = ""; }} />
                </label>
                <button type="button" className="ghost" onClick={loadSample}>Use sample data</button>
                <button type="button" className={"ghost manual-btn" + (inputsOpen ? " on" : "")} aria-expanded={inputsOpen} aria-controls="deal-inputs" onClick={openManual}>Enter deal info manually</button>
                {fileName && <span className="file-name">{fileName}</span>}
              </div>
              {read && <ReadingPanel r={read} />}
              {tzStatus && <p className="status">{tzStatus}</p>}

              {inputsOpen && (
              <div className="inputs" id="deal-inputs">
                <h3 className="inputs-h">Deal info{D.name ? <small>{D.name}</small> : null}</h3>
                <label className="full" style={{ margin: "12px 0" }}>Load a sample deal
                  <select ref={sampleRef} value={example} onChange={(e) => loadExample(e.target.value)}>
                    {EXAMPLE_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </label>
                <div className="fields">
                  {field("name", "Deal name", text("name"), true)}
                  {field("asset", "Asset type", select("asset", ASSETS))}
                  {field("market", "Market", text("market"))}
                  {field("ccy", "Currency", select("ccy", CCYS))}
                  {field("size", "Size", num("size"))}
                  {field("unit", "Size unit", select("unit", UNITS))}
                  {field("price", "Purchase price", num("price"))}
                  {field("noi", "In-place NOI (yr 1)", num("noi"))}
                  {field("occ", "Occupancy %", num("occ"))}
                  {field("opex", "Opex % of revenue", num("opex"))}
                  {field("capex", "Capex budget", num("capex"))}
                  {field("ltv", "LTV %", num("ltv"))}
                  {field("rate", "Interest rate %", num("rate"))}
                  {field("amort", "Amortisation (yrs, 0 = IO)", num("amort"))}
                  {field("hold", "Hold (yrs)", num("hold", "1"))}
                  {field("growth", "NOI growth %/yr", num("growth"))}
                  {field("exitcap", "Exit cap %", num("exitcap"))}
                  {field("plan", "Business plan", <textarea id="plan" value={vals.plan} onChange={(e) => setField("plan", e.target.value)} />, true)}
                  {field("om", "Anything else from the OM (optional)", <textarea id="om" placeholder="Paste a few lines: rent roll notes, lease terms, sponsor, tenancy. No confidential data please." value={vals.om} onChange={(e) => setField("om", e.target.value)} />, true)}
                </div>
                <p className="hint">Assumes 2% closing and 2% sale costs; capex funded from equity in year 1. Nothing you type here is stored.</p>
              </div>
              )}

            </form>
            </div>

            {/* STEP 2: the numbers (shown once there's enough to calculate) */}
            {M && (
            <div className="step-row">
            <div className="step-n" aria-hidden="true">02</div>
            <div className={"card step" + (M ? "" : " locked")} ref={numbersRef}>
              <div className="locked-body" {...(M ? {} : { inert: "", "aria-hidden": "true" })}>
                <h2>See the numbers{D.name ? <small>{D.name}</small> : null}</h2>
                <div className="metrics">
                  {tiles.map(([k, v, n, cls]) => (
                    <div className={"metric " + cls} key={k}><span className="k">{k}</span><span className="v">{v}</span><span className="n">{n}</span></div>
                  ))}
                </div>
                {M ? (
                  <>
                      <h3 className="sub">Levered IRR sensitivity <small>exit cap × NOI growth</small></h3>
                      <div className="scroll">
                        <table className="sens">
                          <thead><tr><th>NOI growth ↓ / exit cap →</th>{caps.map((x) => <th key={x}>{x.toFixed(2)}%</th>)}</tr></thead>
                          <tbody>
                            {gs.map((g) => (
                              <tr key={g}>
                                <th>{g.toFixed(1)}%</th>
                                {caps.map((x) => {
                                  const r = model(D, g, x).irr;
                                  const cls = !isFinite(r) ? "lo" : r < 0.08 ? "lo" : r < 0.13 ? "mid" : "hi";
                                  const base = g === D.growth && x === D.exitcap ? " base" : "";
                                  return <td key={x} className={cls + base}>{isFinite(r) ? pct(r, 1) : "n/m"}</td>;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="hint">Outlined cell is your base case. Red under 8%, amber 8–13%, green 13%+ levered IRR.</p>

                  </>
                ) : null}
              </div>
              {!M && <div className="lock-badge"><LockIcon />{D.name || isFinite(D.price) ? "Still missing: " + missingCore(D) + "." : "Add a deal in step 1 to unlock"}</div>}
            </div>
            </div>
            )}


            {/* STEP 3: Ellie's first pass (locked until there's a deal) */}
            <div className="step-row">
            <div className="step-n" aria-hidden="true">{M ? "03" : "02"}</div>
            <div className={"card step ellie-card" + (M ? "" : " locked")} ref={aiRef}>
              <div className="locked-body" {...(M ? {} : { inert: "", "aria-hidden": "true" })}>
              <div className="ellie-id" style={{ marginBottom: 14 }}>
                <img className="ellie" src="/ellie.webp" alt="Ellie Jr." width="52" height="52" />
                <div><h2 style={{ margin: 0 }}>Screen the Deal with Ellie Jr.</h2><small>Get the verdict, red flags, broker questions and data room list</small></div>
              </div>

              {!leadDone && (
                <form className="capture-in" noValidate onSubmit={submitLead}>
                  <h3 className="sub" style={{ marginTop: 0 }}>Enter your info to access your deal screen analysis</h3>
                  <div className="fields two">
                    <label>Name<input ref={nameRef} required value={lName} onChange={(e) => setLName(e.target.value)} /></label>
                    <label>Work email<input type="email" required value={lEmail} onChange={(e) => setLEmail(e.target.value)} /></label>
                    <label className="hp" aria-hidden="true">Company<input tabIndex={-1} autoComplete="off" value={lTrap} onChange={(e) => setLTrap(e.target.value)} /></label>
                  </div>
                  <div className="row" style={{ marginTop: 14 }}>
                    <button type="submit" className="primary" disabled={lBusy || !M}>Get Ellie Jr.'s first pass</button>
                    {lStatus && <span className="status">{lStatus}</span>}
                  </div>
                  <p className="hint" style={{ margin: "10px 0 0" }}>We'll send you a copy of the report. Unsubscribe at any time.</p>
                </form>
              )}

              {leadDone && (
                <>
                  <p style={{ margin: "0 0 12px" }}>{running ? "Ellie Jr. is writing your deal screen analysis…" : aiRan ? "Your deal screen analysis is ready." : "Run Ellie Jr. on this deal to get your analysis."}</p>
                  <div className="row">
                    {aiRan && <button type="button" className="primary" onClick={openResults}>Open your analysis →</button>}
                    <button type="button" className={aiRan ? "ghost" : "primary"} disabled={running || !M} onClick={() => { openResults(); runAI(true); }}>{aiRan ? "Run it again" : "Run Ellie Jr.'s first pass"}</button>
                  </div>
                  {staleRef.current && aiRan && <p className="status">{aiStatus}</p>}
                </>
              )}
              </div>
              {!M && <div className="lock-badge"><LockIcon />Add a deal above to unlock</div>}
            </div>
            </div>

          </div>

          <div className="foot-logo"><img src="/logo-ink.webp" alt="Fifth Dimension" height="20" /></div>
        </section>
      </main>
      </>
      )}

        <dialog id="solo" ref={soloRef} aria-labelledby="solo-title">
          <div className="solo-in">
            <div className="solo-bar">Fifth Dimension · <span>Solo</span></div>
            <div className="ellie-id" style={{ marginBottom: 8 }}>
              <img className="ellie lg" src="/ellie.webp" alt="Ellie" width="72" height="72" />
              <h2 id="solo-title" style={{ margin: 0 }}>Want Ellie to analyze the real deal?</h2>
            </div>
            <p>Ellie reads the whole package (the OM, the rent roll, the T-12, the loan docs), cross checks the documents and provides an accurate, in depth analysis.</p>
            <table className="cmp">
              <thead><tr><th></th><th>Deal Screen</th><th>Solo</th></tr></thead>
              <tbody>
                <tr><th>Works from</th><td>The headline numbers</td><td>The real numbers based on the complex documentation</td></tr>
                <tr><th>Checks</th><td>Simple math based on your inputs</td><td>The formulas across every deal aspect (the OM against the T-12, the rent roll against the OM)</td></tr>
                <tr><th>Confidential files</th><td>N/A</td><td>Uploaded securely, and never used to train large language models</td></tr>
                <tr><th>What you get</th><td>A short first pass</td><td>A cited IC memo draft your team can check and sign off</td></tr>
              </tbody>
            </table>
            <div className="row solo-cta">
              <a className="btn-primary" href={SOLO_URL} target="_blank" rel="noopener">Start Solo free for 3 months</a>
              <button className="ghost" type="button" onClick={closeSolo}>Not now</button>
            </div>
          </div>
        </dialog>
    </>
  );
}

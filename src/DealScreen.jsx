import React, { useEffect, useMemo, useRef, useState } from "react";
import { EXAMPLES, EXAMPLE_OPTIONS, FIELDS, NUMERIC, ASSETS, CCYS, UNITS, SOLO_URL } from "./data.js";
import { calc, model, money, pct, bps, sym, perUnit, facts } from "./lib/finance.js";
import { md, verdictOf } from "./lib/markdown.js";
import { askEllie, fileToImage } from "./lib/ellie.js";

const AI_IDLE = "Ellie reads the numbers above plus your notes, then writes what a good senior analyst would put in front of IC.";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|proton|protonmail)\./i;

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
  if (code === "network") return "Couldn't reach Ellie. Check your connection and try again.";
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
  const [tzBusy, setTzBusy] = useState(false);
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");

  const [aiText, setAiText] = useState("");
  const [aiRan, setAiRan] = useState(false);
  const [aiStatus, setAiStatus] = useState(AI_IDLE);
  const [running, setRunning] = useState(false);
  const [soloBtn, setSoloBtn] = useState(false);
  const ctrlRef = useRef(null);
  const soloShownRef = useRef(false);
  const soloRef = useRef(null);
  const [soloNote, setSoloNote] = useState(false);

  const [leadDone, setLeadDone] = useState(false);
  const [lName, setLName] = useState("");
  const [lEmail, setLEmail] = useState("");
  const [lStatus, setLStatus] = useState("");
  const [lBusy, setLBusy] = useState(false);
  const [leadResult, setLeadResult] = useState(null);

  const nameRef = useRef(null);
  const aiRef = useRef(null);

  const D = useMemo(() => parseVals(vals), [vals]);
  const M = useMemo(() => calc(D), [D]);

  // ---------- one screen: the numbers appear under the deal as soon as there is enough to calculate ----------
  useEffect(() => {
    // Old links to /numbers land on the single page.
    if (window.location.pathname.replace(/\/+$/, "") === "/numbers") { try { window.history.replaceState(null, "", "/" + window.location.search); } catch {} }
  }, []);

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
    if (fileRef.current) fileRef.current.value = "";
    setFileName("");
    setInputsOpen(true);
    setTzStatus("Sample deal loaded: a 312-unit multifamily in Austin. Pick a different sample deal below, or scroll down for the numbers.");
    // Stay here so the user can choose a sample deal; bring the picker into view instead of jumping to the numbers.
    setTimeout(() => { const el = sampleRef.current; if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({ preventScroll: true }); } }, 60);
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
    let image = null;
    if (file) {
      try { image = await fileToImage(file); }
      catch (e) { setTzStatus(e && e.code === "too_big" ? "That file is too large. Try one under 4.5 MB, or paste the text." : "Couldn't open that file. Paste the text instead."); return; }
    }
    setTzBusy(true);
    setTzStatus("Ellie is reading the document…");
    try {
      const res = await askEllie({ task: "extract", text: t, image });
      const m = (res.text || "").match(/\{[\s\S]*\}/);
      if (!m) throw { code: "parse" };
      applyTeaser(JSON.parse(m[0]));
    } catch (e) {
      setTzStatus(errorMessage(e, "Ellie couldn't read that one. Try pasting the text, or type the numbers in."));
    } finally {
      setTzBusy(false);
    }
  }

  function applyTeaser(x) {
    const nv = { ...vals };
    const nt = {};
    const v = (k) => { const o = x[k]; const val = o && typeof o === "object" ? o.value : o; return val === null || val === undefined || val === "" ? null : val; };
    const q = (k) => (x[k] && x[k].source ? "“" + String(x[k].source).slice(0, 90) + "”" : "the document");
    const numv = (k) => { const a = v(k); if (a === null) return NaN; return typeof a === "number" ? a : parseFloat(String(a).replace(/[^0-9.\-]/g, "")); };
    const from = (k) => ({ text: "From the document: " + q(k), cls: "" });
    const miss = (id, msg) => { nv[id] = ""; nt[id] = { text: msg || "Not in the document: add it", cls: "miss" }; };
    let found = 0;

    ["name", "market"].forEach((k) => { const a = v(k); if (a !== null) { nv[k] = String(a); nt[k] = from(k); found++; } else miss(k); });
    const asset = v("asset"); if (ASSETS.includes(asset)) { nv.asset = asset; nt.asset = from("asset"); found++; }
    const ccy = v("ccy"); if (CCYS.includes(ccy)) nv.ccy = ccy;
    const unit = v("unit"); if (UNITS.includes(unit)) nv.unit = unit;
    ["size", "price", "occ"].forEach((k) => { const a = numv(k); if (isFinite(a)) { nv[k] = a; nt[k] = from(k); found++; } else miss(k); });
    const noi = numv("noi"), cap = numv("cap"), price = parseFloat(nv.price);
    if (isFinite(noi)) { nv.noi = noi; nt.noi = from("noi"); found++; }
    else if (isFinite(cap) && isFinite(price)) { nv.noi = Math.round((price * cap) / 100); nt.noi = { text: "Worked out: " + cap + "% cap rate × price, from " + q("cap"), cls: "" }; found++; }
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
    setTzStatus("Ellie filled " + found + " fields from the document. Add what's missing below to see the numbers.");
    autoNumbersRef.current = true;
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
    setAiStatus("Ellie is reading the deal…");
    const t0 = performance.now();
    try {
      const res = await askEllie({ task: "firstpass", facts: facts(D, M) }, { signal: ctrl.signal, onText: ({ text }) => setAiText(text) });
      setAiText(res.text);
      setAiRan(true);
      staleRef.current = false;
      setSoloBtn(true);
      if (!soloShownRef.current) { soloShownRef.current = true; setTimeout(openSolo, 1500); }
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
    try { await navigator.clipboard.writeText(brief()); setAiStatus("IC brief copied."); }
    catch { setAiStatus("Copy was blocked by the browser. Select the text above and copy it."); }
  }

  // ---------- lead capture (mocked; production posts to HubSpot) ----------
  async function submitLead(ev) {
    ev.preventDefault();
    const name = lName.trim(), email = lEmail.trim();
    if (!name || !EMAIL_RE.test(email)) { setLStatus("Add your name and a work email."); return; }
    setLeadDone(true);
    setLBusy(true);
    setLStatus("Ellie is on it…");
    const out = await runAI(true);
    setLeadResult({ name, email, text: out || "", ran: !!out, D, M });
    setLStatus("Demo mode: in production this goes straight to HubSpot.");
    setLBusy(false);
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

  const caps = M ? [-0.25, 0, 0.25, 0.5, 0.75].map((x) => D.exitcap + x) : [];
  const gs = M ? [D.growth - 2, D.growth, D.growth + 2] : [];

  return (
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
            {/* STEP 1: enter the deal */}
            <div className="step-row">
            <div className="step-n" aria-hidden="true">1</div>
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
                <span className="or">or</span>
                <button type="button" className="ghost" onClick={loadSample}>Use sample data</button>
                {fileName && <span className="file-name">{fileName}</span>}
              </div>
              {tzStatus && <p className="status">{tzStatus}</p>}

              <details className="inputs" open={inputsOpen} onToggle={(e) => setInputsOpen(e.currentTarget.open)}>
                <summary>Enter deal info manually{D.name ? <small>{D.name}</small> : null}</summary>
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
              </details>

            </form>
            </div>

            {/* STEP 2: the numbers (locked until there's a deal) */}
            <div className="step-row">
            <div className="step-n" aria-hidden="true">2</div>
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


            {/* STEP 3: Ellie's first pass (locked until there's a deal) */}
            <div className="step-row">
            <div className="step-n" aria-hidden="true">3</div>
            <div className={"card step ellie-card" + (M ? "" : " locked")} ref={aiRef}>
              <div className="locked-body" {...(M ? {} : { inert: "", "aria-hidden": "true" })}>
              <div className="ellie-id" style={{ marginBottom: 14 }}>
                <img className="ellie" src="/ellie.webp" alt="Ellie" width="52" height="52" />
                <div><h2 style={{ margin: 0 }}>Ellie's first pass</h2><small>Verdict, red flags, broker questions and the data-room list</small></div>
              </div>

              {!leadDone && (
                <form className="capture-in" noValidate onSubmit={submitLead}>
                  <h3 className="sub" style={{ marginTop: 0 }}>Where should we send your first pass?</h3>
                  <div className="fields two">
                    <label>Name<input ref={nameRef} required value={lName} onChange={(e) => setLName(e.target.value)} /></label>
                    <label>Work email<input type="email" required value={lEmail} onChange={(e) => setLEmail(e.target.value)} /></label>
                  </div>
                  <div className="row" style={{ marginTop: 14 }}>
                    <button type="submit" className="primary" disabled={lBusy || !M}>Get Ellie's first pass</button>
                    {lStatus && <span className="status">{lStatus}</span>}
                  </div>
                  <p className="hint" style={{ margin: "10px 0 0" }}>We'll use these details to send your brief and to follow up about Fifth Dimension. Unsubscribe any time.</p>
                </form>
              )}

              {leadDone && (
                <>
                  <div className="row">
                    <button type="button" className={aiRan ? "ghost" : "primary"} disabled={running || !M} onClick={() => runAI(true)}>{aiRan ? "Run it again" : "Run Ellie's first pass"}</button>
                    <button type="button" className="ghost" disabled={!aiRan || running} onClick={copyBrief}>Copy IC brief</button>
                    {soloBtn && <button type="button" className="ghost" onClick={openSolo}>Go deeper in Solo</button>}
                  </div>
                  <p className="status">{aiStatus}</p>
                  <div id="ai" dangerouslySetInnerHTML={{ __html: md(aiText) }} />
                </>
              )}
              </div>
              {!M && <div className="lock-badge"><LockIcon />Unlocks with the numbers</div>}
            </div>
            </div>

            {leadResult && (
              <div className="step-row">
              <div className="step-n spacer" aria-hidden="true" />
              <div className="card step">
                {lStatus && <p className="hint" style={{ marginTop: 0 }}>{lStatus}</p>}
                <LeadResult r={leadResult} />
              </div>
              </div>
            )}
          </div>

          <div className="foot-logo"><img src="/logo-ink.webp" alt="Fifth Dimension" height="20" /></div>
        </section>

        <dialog id="solo" ref={soloRef} aria-labelledby="solo-title">
          <div className="solo-in">
            <div className="solo-bar">Fifth Dimension · <span>Solo</span></div>
            <div className="ellie-id" style={{ marginBottom: 8 }}>
              <img className="ellie lg" src="/ellie.webp" alt="Ellie" width="72" height="72" />
              <h2 id="solo-title" style={{ margin: 0 }}>Want Ellie to analyze actual documents?</h2>
            </div>
            <p>In Solo, Ellie reads the whole package (the OM, the rent roll, the T-12, the loan docs), checks one against another the way a senior associate would, and links every figure back to the clause, cell or page it came from.</p>
            <table className="cmp">
              <thead><tr><th></th><th>Deal Screen</th><th>Solo</th></tr></thead>
              <tbody>
                <tr><th>Works from</th><td>The headline numbers</td><td>The documents themselves</td></tr>
                <tr><th>Checks</th><td>The math on your inputs</td><td>The formulas across every deal aspect (the OM against the T-12, the rent roll against the OM)</td></tr>
                <tr><th>Confidential files</th><td>N/A</td><td>Uploaded securely, and never used to train large language models</td></tr>
                <tr><th>What you get</th><td>A one-page first pass</td><td>A cited IC memo draft your team can check and sign off</td></tr>
              </tbody>
            </table>
            <div className="row solo-cta">
              <a className="btn-primary" href={SOLO_URL} target="_blank" rel="noopener" onClick={() => setSoloNote(true)}>Start Solo free for 3 months</a>
              <button className="ghost" type="button" onClick={closeSolo}>Not now</button>
            </div>
            {soloNote && (
              <p className="hint" style={{ marginTop: 10, textAlign: "center" }}>Solo sign-up has opened in a new tab. <span className="tag">later</span> In production the three-month offer is applied automatically, and HubSpot records solo_trial_started against this contact.</p>
            )}
          </div>
        </dialog>
      </main>
    </>
  );
}

function LeadResult({ r }) {
  const { D, M } = r;
  const first = r.name.split(" ")[0];
  const dn = D.name || "your deal";
  const verdict = verdictOf(r.text);
  const today = new Date().toISOString().slice(0, 10);
  const dom = (r.email.split("@")[1] || "").toLowerCase();
  const freeMail = FREE_MAIL.test(r.email);
  const utm = new URLSearchParams(window.location.search);
  const props = [
    ["email", r.email],
    ["firstname / lastname", r.name],
    ["company domain", dom + (freeMail ? " (personal address: verify firm)" : "")],
    ["company, AUM band, region, job title", "Filled in by enrichment from the email domain"],
    ["lifecyclestage", "lead, then MQL once fit is confirmed"],
    ["lead_source", "Deal Screen"],
    ["mql_trigger", "screen_run"],
    ["deal_screened", (D.asset || "") + " · " + (D.market || "") + (verdict ? " · verdict: " + verdict : "")],
    ["utm_source / utm_campaign", (utm.get("utm_source") || "direct") + " / " + (utm.get("utm_campaign") || "none")],
  ];
  const flow = ["Send email: PDF first pass + Solo offer, three months free", "Enrich firm, AUM, region and title from the email domain", "Score fit and route the lead"];

  return (
    <div className="result">
      {r.ran ? (
        <>
          <p style={{ margin: "0 0 4px" }}><strong>Thanks, {first}. Your first pass is above, and a PDF copy is on its way to {r.email}.</strong></p>
          <details open>
            <summary>Preview: the email they receive <span className="tag">mock</span></summary>
            <div className="mock">
              <div className="hint">From: Fifth Dimension · Subject: Ellie's first pass on {dn}<br />Attached: IC-first-pass.pdf</div>
              <p>Hi {first},</p>
              <p>Ellie's first pass on {dn} is attached as a one-page PDF. Verdict: <strong>{verdict || "see the brief"}</strong>. Every number is calculated from your inputs, and you can rerun the screen any time from the link.</p>
              <p>Want Ellie to read the actual OM, rent roll and T-12? Upload them securely in Solo, and every figure comes back linked to its page. Your first three months are free.</p>
            </div>
          </details>
          <details open>
            <summary>Preview: the PDF attached <span className="tag">mock</span></summary>
            <div className="pdf">
              <div className="bar"><div>Fifth Dimension · <span>IC first pass</span></div><small>{today}</small></div>
              <p className="deal">{dn}</p>
              <div className="hint">{D.asset + " · " + (D.market || "") + " · " + money(D.price, D.ccy)}</div>
              {M && (
                <div className="kpis">
                  <div>Going-in cap<b>{pct(M.cap, 2)}</b></div>
                  <div>DSCR<b>{isFinite(M.dscr) ? M.dscr.toFixed(2) + "x" : "n/a"}</b></div>
                  <div>Debt yield<b>{pct(M.dy, 1)}</b></div>
                  <div>Levered IRR<b>{isFinite(M.irr) ? pct(M.irr, 1) : "n/m"}</b></div>
                </div>
              )}
              <div dangerouslySetInnerHTML={{ __html: md(r.text) }} />
              <div className="foot">Prepared with 5D Deal Screen. Metrics are arithmetic on the inputs given; the note is an AI-generated first pass to check, not advice.</div>
            </div>
          </details>
        </>
      ) : (
        <p style={{ margin: "0 0 4px" }}><strong>Thanks, {first}. We have your details.</strong> The first pass couldn't run just now, so nothing has been emailed yet. Click Run Ellie's first pass above to try again.</p>
      )}
      <details>
        <summary>What HubSpot records <span className="tag">connected later</span></summary>
        <div className="mock">
          <table className="hs"><tbody>
            {props.map(([k, v]) => <tr key={k}><th>{k}</th><td>{String(v)}</td></tr>)}
          </tbody></table>
          <p className="hint" style={{ marginTop: 8 }}><strong>Routing after enrichment:</strong> MQL if the firm has $1-10bn AUM in the US, UK or Singapore and the contact sits on the buying committee (AE call within 24-48h); otherwise enterprise review, nurture or Solo. Workflow: {flow.join(" → ")}</p>
        </div>
      </details>
    </div>
  );
}

import React from "react";
import { esc } from "./lib/markdown.js";
import { parseReport, parseNumber, parseFlag } from "./lib/reportParse.js";

const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
const H = ({ s, as: Tag = "span", className }) => <Tag className={className} dangerouslySetInnerHTML={{ __html: inline(s) }} />;

// ---------- icons ----------
const XIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
);
const DocIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
);
const BulbIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" /></svg>
);
const RagIcon = ({ rag }) => (
  <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {rag === "green" ? <path d="M5 12.5l4.5 4.5L19 7" /> : rag === "red" ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M12 6v8" /><path d="M12 18.5v.01" /></>}
  </svg>
);

// Segmented bar: how strong this metric is on a fixed weak → strong scale, coloured by the same thresholds as the numbers grid.
function Bar({ fill, rag }) {
  const n = 20, on = Math.max(1, Math.round(Math.min(1, Math.max(0, fill)) * n));
  return (
    <div className={"rp-bar rag-" + rag} role="img" aria-label={"Strength " + Math.round(fill * 100) + " out of 100"}>
      <div className="rp-bar-segs">{Array.from({ length: n }, (_, i) => <i key={i} className={i < on ? "on" : ""} />)}</div>
      <div className="rp-bar-scale"><span>weak</span><span>strong</span></div>
    </div>
  );
}

// Big figure with a smaller word unit ("bps", "bn"), so long values fit their column.
function BigValue({ v }) {
  const m = v.match(/^(.*?\d)\s?(bps|bn|m|M|k)$/);
  return m ? <>{m[1]}<small className="rp-unit">{m[2]}</small></> : <>{v}</>;
}


// ---------- report ----------
export default function Report({ text, running, score }) {
  const r = parseReport(text);
  const S = r.sections;
  const nums = (S.numbers?.items || []).map(parseNumber);
  const flags = (S.flags?.items || []).map(parseFlag);
  const qs = S.questions?.items || [];
  const dr = S.dataroom?.items || [];
  const mind = S.mind ? [...S.mind.text, ...S.mind.items].join(" ") : "";
  const others = r.order.filter((k) => k.startsWith("other:"));

  if (!r.verdict && running) {
    return <div className="rp-wait"><span className="rp-dot" /> Ellie Jr. is reading the deal…</div>;
  }

  return (
    <div className="rp">
      {r.verdict && (
        <section className={"rp-verdict rag-" + r.verdict.rag} aria-label="Verdict">
          <div className="rp-rag">
            <span className="rp-rag-icon"><RagIcon rag={r.verdict.rag} /></span>
            <div>
              <div className="rp-kicker">Ellie Jr.'s verdict</div>
              <div className="rp-rag-label">{r.verdict.label}</div>
            </div>
          </div>
          {r.verdict.why && <H as="p" className="rp-why" s={r.verdict.why} />}
        </section>
      )}

      {nums.length > 0 && (
        <section className="rp-sec" aria-label="The three numbers that matter">
          <h3 className="rp-h rp-h-xl">The three numbers <span>that matter</span></h3>
          <div className="rp-nums">
            {nums.map((n, i) => {
              const sc = score ? score(n.label) : null;
              return (
                <div className="rp-num" key={i}>
                  {sc && <Bar fill={sc.fill} rag={sc.rag} />}
                  <div className="rp-num-v"><BigValue v={n.value || String(i + 1).padStart(2, "0")} /></div>
                  <H as="div" className="rp-num-l" s={n.label} />
                  {n.body && <H as="p" className="rp-num-b" s={n.body} />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {flags.length > 0 && (
        <section className="rp-sec" aria-label="Red flags">
          <h3 className="rp-h">Red flags</h3>
          <ul className="rp-flags">
            {flags.map((f, i) => (
              <li key={i}>
                <span className="rp-x"><XIcon /></span>
                <div>
                  {f.title && <H as="div" className="rp-flag-t" s={f.title} />}
                  {f.body && <H as="p" className="rp-flag-b" s={f.body} />}
                  {f.check && <p className="rp-check"><span>Check</span><H s={f.check} /></p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {qs.length > 0 && (
        <section className="rp-sec" aria-label="Questions for the broker">
          <h3 className="rp-h">Questions for the broker</h3>
          <div className="rp-qs">
            {qs.map((q, i) => (
              <div className="rp-q" key={i}>
                <span className="rp-q-mark" aria-hidden="true">?</span>
                <div className="rp-q-n">Question {i + 1}</div>
                <H as="p" className="rp-q-t" s={q} />
              </div>
            ))}
          </div>
        </section>
      )}

      {dr.length > 0 && (
        <section className="rp-sec" aria-label="Data room request">
          <h3 className="rp-h">Data room request</h3>
          <ul className="rp-dr">
            {dr.map((d, i) => <li key={i}><DocIcon /><H s={d} /></li>)}
          </ul>
        </section>
      )}

      {mind && (
        <section className="rp-mind" aria-label="What would change my mind">
          <span className="rp-mind-i"><BulbIcon /></span>
          <div>
            <h3 className="rp-h" style={{ margin: 0 }}>What would change my mind</h3>
            <H as="p" s={mind} />
          </div>
        </section>
      )}

      {others.map((k) => (
        <section className="rp-sec" key={k}>
          <h3 className="rp-h">{S[k].title}</h3>
          {S[k].text.map((t, i) => <H as="p" key={"t" + i} s={t} />)}
          {S[k].items.length > 0 && <ul className="rp-dr">{S[k].items.map((t, i) => <li key={i}><H s={t} /></li>)}</ul>}
        </section>
      ))}

      {running && <div className="rp-wait"><span className="rp-dot" /> Ellie Jr. is still writing…</div>}
    </div>
  );
}

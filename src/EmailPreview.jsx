import React, { useEffect } from "react";
import { SOLO_URL } from "./data.js";

/*
  5D Deal Screen: follow-up email (HubSpot template preview)
  Contact properties set by the Deal Screen form on submit:
    deal_name, deal_market, deal_verdict, deal_verdict_reason,
    deal_going_in_cap, deal_dscr, deal_debt_yield, deal_levered_irr,
    deal_top_red_flag
  Book-a-call link: the contact owner's HubSpot meetings link, with a
  team meetings page as fallback (replace the placeholder URL).
*/

export const SAMPLE_EMAIL = {
  firstName: "Jo",
  dealName: "The Mercer · 312-unit garden multifamily",
  market: "Austin, TX",
  verdict: "Pass",
  verdictReason: "Negative leverage and 2,900 new units leave too little margin at $78.0M.",
  kpis: [
    ["Going-in cap", "5.10%"],
    ["DSCR", "1.14x"],
    ["Debt yield", "8.5%"],
    ["Levered IRR", "9.7%"],
  ],
  bookCallUrl: "https://www.fifthdimensionai.com/contact",
};

// Same red / amber / green as the results page: Pass = walk away (red), Pursue with conditions = amber, Pursue = green.
const ragColour = (v) => (/^pass\b/i.test(v) ? "#d93a2f" : /condition/i.test(v) ? "#d98a00" : "#1f9d63");

const DISPLAY = "'League Gothic','Arial Narrow',Impact,sans-serif";
const MONO = "'IBM Plex Mono',Menlo,Consolas,'Courier New',monospace";
const tbl = { role: "presentation", width: "100%", cellPadding: 0, cellSpacing: 0, border: 0 };
const eyebrow = { fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#6b6562" };

const responsiveCss = `
  .email-root a{color:#f35202}
  @media (max-width:620px){
    .email-root .container{width:100%!important}
    .email-root .px{padding-left:20px!important;padding-right:20px!important}
    .email-root .kpi{display:block!important;width:100%!important;border-left:0!important;border-top:1px solid #e2e2e2!important}
    .email-root .h1{font-size:34px!important}
  }
`;

export default function EmailPreview({ data = SAMPLE_EMAIL }) {
  const e = data;
  useEffect(() => {
    document.title = `Fifth Dimension Deal Screen: ${e.dealName.split(" · ")[0]}`;
    const prev = document.body.style.background;
    document.body.style.background = "#e2e2e2";
    return () => { document.body.style.background = prev; };
  }, [e.dealName]);

  return (
    <div className="email-root" style={{ margin: 0, padding: 0, background: "#e2e2e2" }}>
      <style>{responsiveCss}</style>
      <div style={{ background: "#201d1d", color: "#fff", fontFamily: "Menlo,monospace", fontSize: 12, padding: "10px 16px", textAlign: "center" }}>
        Preview with sample values (Austin example). Subject: <strong>Fifth Dimension Deal Screen: The Mercer</strong> · Attachment: IC-first-pass.pdf
      </div>
      <div style={{ display: "none", maxHeight: 0, overflow: "hidden", opacity: 0 }}>
        Your IC first pass is attached. Verdict: {e.verdict}.
      </div>

      <table {...tbl} style={{ background: "#e2e2e2" }}><tbody><tr><td align="center" style={{ padding: "24px 12px" }}>
        <table {...tbl} className="container" width="600" style={{ width: 600, maxWidth: 600, background: "#ffffff", fontFamily: MONO, color: "#201d1d" }}><tbody>

          {/* Header */}
          <tr><td className="px" style={{ background: "#201d1d", padding: "20px 32px" }}>
            <table {...tbl}><tbody><tr>
              <td width="64" valign="middle"><img src="/mark5d.webp" width="58" height="48" alt="5D" style={{ display: "block", border: 0 }} /></td>
              <td valign="middle" style={{ paddingLeft: 14, fontFamily: DISPLAY, fontSize: 26, lineHeight: 1, letterSpacing: ".03em", textTransform: "uppercase", color: "#ffffff" }}>
                Deal Screen: <span style={{ color: "#f35202" }}>{e.dealName.split(" · ")[0]}</span>
              </td>
            </tr></tbody></table>
          </td></tr>

          {/* Intro */}
          <tr><td className="px" style={{ padding: "30px 32px 8px", fontSize: 14, lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 14px" }}>Hi {e.firstName},</p>
            <p style={{ margin: "0 0 14px" }}>Attached, please find Ellie Jr.'s analysis of <strong>{e.dealName.split(" · ")[0]}</strong>.</p>
          </td></tr>

          {/* Snapshot */}
          <tr><td className="px" style={{ padding: "6px 32px 0" }}>
            <table {...tbl} style={{ border: "1px solid #e2e2e2" }}><tbody>
              <tr><td style={{ padding: "16px 18px 12px" }}>
                <div style={eyebrow}>Verdict</div>
                <div className="h1" style={{ fontFamily: DISPLAY, fontSize: 40, lineHeight: 1.05, textTransform: "uppercase", color: ragColour(e.verdict), margin: "4px 0 6px" }}>{e.verdict}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "#201d1d" }}>{e.verdictReason}</div>
              </td></tr>
              <tr><td style={{ borderTop: "1px solid #e2e2e2" }}>
                <table {...tbl}><tbody><tr>
                  {e.kpis.map(([k, v], i) => (
                    <td key={k} className="kpi" width="25%" style={{ padding: "12px 18px", borderTop: "3px solid #f35202", borderLeft: i ? "1px solid #e2e2e2" : undefined }}>
                      <div style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b6562" }}>{k}</div>
                      <div style={{ fontFamily: DISPLAY, fontSize: 28, lineHeight: 1.1 }}>{v}</div>
                    </td>
                  ))}
                </tr></tbody></table>
              </td></tr>
            </tbody></table>
          </td></tr>

          <tr><td className="px" style={{ padding: "16px 32px 4px", fontSize: 13, lineHeight: 1.6, color: "#201d1d" }}>
            <p style={{ margin: "0 0 24px" }}>The PDF also has the broker questions and the data-room list. It's a first pass for your team to check, not advice.</p>
          </td></tr>

          {/* Solo offer */}
          <tr><td className="px" style={{ background: "#f1f0ee", padding: "28px 32px" }}>
            <table {...tbl}><tbody><tr>
              <td width="84" valign="top"><img src="/ellie.webp" width="72" height="72" alt="Ellie" style={{ display: "block", border: 0, borderRadius: "50%" }} /></td>
              <td valign="top" style={{ paddingLeft: 6 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 28, lineHeight: 1.05, textTransform: "uppercase", color: "#201d1d" }}>Want Ellie to analyze the real deal?</div>
                <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6 }}>Upload the whole package (the OM, the rent roll, the T-12, the loan docs) for a more accurate, in-depth analysis. Uploaded files are protected and never used to train large language models.</p>
              </td>
            </tr></tbody></table>
            <table {...tbl}><tbody><tr><td align="center" style={{ paddingTop: 22 }}>
              <a href={SOLO_URL} style={{ display: "inline-block", padding: "16px 34px", borderRadius: 4, backgroundColor: "#e15e29", border: "2px solid #e15e29", color: "#ffffff", textDecoration: "none", fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase" }}>Start Solo free for one month</a>
            </td></tr></tbody></table>
          </td></tr>

          {/* Talk to an expert */}
          <tr><td className="px" style={{ padding: "30px 32px 34px" }}>
            <table {...tbl}><tbody><tr>
              <td width="84" valign="top"><img src="/johnny.webp" width="72" height="72" alt="Johnny Morris" style={{ display: "block", border: 0, borderRadius: "50%" }} /></td>
              <td valign="top" style={{ paddingLeft: 6 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 28, lineHeight: 1.05, textTransform: "uppercase", color: "#201d1d" }}>Want AI in every deal <span style={{ color: "#f35202" }}>from the start?</span></div>
                <div style={{ marginTop: 6, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b6562" }}>Johnny Morris · Chief Product Officer, Fifth Dimension</div>
                <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6 }}>Book a 30-minute call with one of our real estate experts. We'll look at how your team works today and where AI can make the biggest difference.</p>
              </td>
            </tr></tbody></table>
            <table {...tbl}><tbody><tr><td align="center" style={{ paddingTop: 20 }}>
              <a href={e.bookCallUrl} style={{ display: "inline-block", padding: "15px 32px", border: "2px solid #221f20", borderRadius: 4, color: "#221f20", textDecoration: "none", fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase" }}>Book a call with an expert</a>
            </td></tr></tbody></table>
          </td></tr>

          {/* Footer */}
          <tr><td className="px" style={{ background: "#201d1d", padding: "16px 32px", fontSize: 9, lineHeight: 1.5, color: "#a39b95" }}>
            <table {...tbl}><tbody><tr>
              <td valign="middle" style={{ color: "#a39b95", fontSize: 9 }}>
                You're getting this because you ran a deal through 5D Deal Screen.<br />
                <a href="#" style={{ color: "#a39b95" }}>Unsubscribe</a>
              </td>
              <td align="right" valign="middle" width="150"><img src="/logo-white.webp" width="140" alt="Fifth Dimension" style={{ display: "block", border: 0, width: 140, height: "auto" }} /></td>
            </tr></tbody></table>
          </td></tr>

        </tbody></table>
      </td></tr></tbody></table>
    </div>
  );
}

// Follow-up email (HTML + plain text), mirroring src/EmailPreview.jsx so the preview and the sent email match.
// Images are absolute PNG URLs on this site (public/email/*.png); email apps handle PNG better than WebP.

const DISPLAY = "'League Gothic','Arial Narrow',Impact,sans-serif";
const MONO = "'IBM Plex Mono',Menlo,Consolas,'Courier New',monospace";
const SOLO_URL = "https://access.5dai.io/ui/sign-in?redirect=%2Fui";
export const CONTACT_URL = "https://www.fifthdimensionai.com/contact";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ragColour = (v) => (/^pass\b/i.test(v) ? "#d93a2f" : /condition/i.test(v) ? "#d98a00" : "#1f9d63");
const TBL = 'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"';
const EYEBROW = "font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#6b6562";

export function buildEmail(e) {
  const img = (name) => `${e.baseUrl}/email/${name}.png`;
  const kpis = e.kpis.map(([k, v], i) => `
    <td class="kpi" width="25%" style="padding:12px 18px;border-top:3px solid #e15e29;${i ? "border-left:1px solid #e2e2e2;" : ""}">
      <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6b6562">${esc(k)}</div>
      <div style="font-family:${DISPLAY};font-size:28px;line-height:1.1">${esc(v)}</div>
    </td>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(e.subject)}</title>
<style>
  a{color:#f35202}
  @media (max-width:620px){
    .container{width:100%!important}
    .px{padding-left:20px!important;padding-right:20px!important}
    .kpi{display:block!important;width:100%!important;border-left:0!important}
    .h1{font-size:34px!important}
  }
</style></head>
<body style="margin:0;padding:0;background:#e2e2e2">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your IC first pass is attached. Verdict: ${esc(e.verdict)}.</div>
<table ${TBL} style="background:#e2e2e2"><tr><td align="center" style="padding:24px 12px">
<table ${TBL} class="container" width="600" style="width:600px;max-width:600px;background:#ffffff;font-family:${MONO};color:#201d1d">

<tr><td class="px" style="background:#201d1d;padding:20px 32px">
  <table ${TBL}><tr>
    <td width="64" valign="middle"><img src="${img("mark5d")}" width="58" height="48" alt="5D" style="display:block;border:0"></td>
    <td valign="middle" style="padding-left:14px;font-family:${DISPLAY};font-size:26px;line-height:1;letter-spacing:.03em;text-transform:uppercase;color:#ffffff">Deal Screen: <span style="color:#f35202">${esc(e.dealShort)}</span></td>
  </tr></table>
</td></tr>

<tr><td class="px" style="padding:30px 32px 8px;font-size:14px;line-height:1.6">
  <p style="margin:0 0 14px">Hi ${esc(e.firstName)},</p>
  <p style="margin:0 0 14px">Attached, please find Ellie Jr.'s analysis of <strong>${esc(e.dealShort)}</strong>.</p>
</td></tr>

<tr><td class="px" style="padding:6px 32px 0">
  <table ${TBL} style="border:1px solid #e2e2e2">
    <tr><td style="padding:16px 18px 12px">
      <div style="${EYEBROW}">Verdict</div>
      <div class="h1" style="font-family:${DISPLAY};font-size:40px;line-height:1.05;text-transform:uppercase;color:${ragColour(e.verdict)};margin:4px 0 6px">${esc(e.verdict)}</div>
      <div style="font-size:13px;line-height:1.5;color:#201d1d">${esc(e.verdictReason)}</div>
    </td></tr>
    <tr><td style="border-top:1px solid #e2e2e2"><table ${TBL}><tr>${kpis}</tr></table></td></tr>
  </table>
</td></tr>

<tr><td class="px" style="padding:16px 32px 4px;font-size:13px;line-height:1.6;color:#201d1d">
  <p style="margin:0 0 6px">The PDF also has the broker questions and the data-room list. It's a first pass for your team to check, not advice.</p>
  <p style="margin:0 0 24px;font-size:9px;line-height:1.5;color:#8a827d">Every number is calculated from the inputs you gave, so you can trace each one.</p>
</td></tr>

<tr><td class="px" style="background:#f1f0ee;padding:28px 32px">
  <table ${TBL}><tr>
    <td width="84" valign="top"><img src="${img("ellie")}" width="72" height="72" alt="Ellie" style="display:block;border:0;border-radius:50%"></td>
    <td valign="top" style="padding-left:6px">
      <div style="font-family:${DISPLAY};font-size:28px;line-height:1.05;text-transform:uppercase;color:#201d1d">Want Ellie to analyze the real deal?</div>
      <p style="margin:8px 0 0;font-size:13px;line-height:1.6">Upload the whole package (the OM, the rent roll, the T-12, the loan docs), for a more accurate, in depth analysis. Uploaded files are protected and never used to train large language models.</p>
    </td>
  </tr></table>
  <table ${TBL}><tr><td align="center" style="padding-top:22px">
    <a href="${SOLO_URL}" style="display:inline-block;padding:16px 34px;border-radius:4px;background-color:#e15e29;border:2px solid #e15e29;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:.12em;text-transform:uppercase">Start Solo free for 3 months</a>
  </td></tr></table>
</td></tr>

<tr><td class="px" style="padding:30px 32px 6px">
  <table ${TBL}><tr>
    <td width="84" valign="top"><img src="${img("johnny")}" width="72" height="72" alt="Johnny Morris" style="display:block;border:0;border-radius:50%"></td>
    <td valign="top" style="padding-left:6px">
      <div style="font-family:${DISPLAY};font-size:28px;line-height:1.05;text-transform:uppercase;color:#201d1d">Want AI in every deal <span style="color:#f35202">from the start?</span></div>
      <div style="margin-top:6px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#6b6562">Johnny Morris · Chief Product Officer, Fifth Dimension</div>
      <p style="margin:8px 0 0;font-size:13px;line-height:1.6">Book a 30-minute consultation with one of our real estate experts. We'll explore your current workflows and where there's room for AI optimization.</p>
    </td>
  </tr></table>
  <table ${TBL}><tr><td align="center" style="padding-top:20px">
    <a href="${CONTACT_URL}" style="display:inline-block;padding:15px 32px;border:2px solid #221f20;border-radius:4px;color:#221f20;text-decoration:none;font-size:13px;letter-spacing:.12em;text-transform:uppercase">Book a call with an expert</a>
  </td></tr></table>
</td></tr>

<tr><td class="px" style="padding:26px 32px 30px;font-size:13px;line-height:1.6"><p style="margin:0">The Fifth Dimension team</p></td></tr>

<tr><td class="px" style="background:#201d1d;padding:16px 32px;font-size:9px;line-height:1.5;color:#a39b95">
  <table ${TBL}><tr>
    <td valign="middle" style="color:#a39b95;font-size:9px">You're getting this because you ran a deal through 5D Deal Screen.<br>
      <a href="${esc(e.unsubscribeUrl)}" style="color:#a39b95">Unsubscribe</a></td>
    <td align="right" valign="middle" width="150"><img src="${img("logo-white")}" width="140" alt="Fifth Dimension" style="display:block;border:0;width:140px;height:auto"></td>
  </tr></table>
</td></tr>

</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Hi ${e.firstName},`,
    "",
    `Attached, please find Ellie Jr.'s analysis of ${e.dealShort}.`,
    "",
    `Verdict: ${e.verdict}. ${e.verdictReason}`,
    e.kpis.map(([k, v]) => `${k} ${v}`).join(" · "),
    "",
    "Upload the whole package (the OM, the rent roll, the T-12, the loan docs), for a more accurate, in depth analysis. Uploaded files are protected and never used to train large language models.",
    `Start Solo free for 3 months: ${SOLO_URL}`,
    `Book a call with an expert: ${CONTACT_URL}`,
    "",
    "The Fifth Dimension team",
  ].filter((l) => l !== null).join("\n");

  return { html, text };
}

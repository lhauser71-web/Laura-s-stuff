// Vercel Node function: emails the follow-up (with the one-page PDF) from Laura's Gmail.
// Needs GMAIL_USER and GMAIL_APP_PASSWORD (a Google app password) in the project's environment variables.
//
// Abuse guards, since this is a public form sending from a personal inbox:
//  - figures are recalculated here from the deal inputs (never taken from the browser)
//  - sample deals use the prepared brief from the server; live notes are length-capped and stripped of links
//  - hidden honeypot field, same-site check, per-visitor and daily caps (per server instance)

import nodemailer from "nodemailer";
import { EXAMPLES, FIELDS, NUMERIC } from "../src/data.js";
import { calc, money, pct, bps } from "../src/lib/finance.js";
import { SAMPLE_BRIEFS } from "../src/sampleBriefs.js";
import { parseReport, parseNumber, parseFlag } from "../src/lib/reportParse.js";
import { buildEmail } from "./_lib/emailHtml.js";
import { buildBriefPdf } from "./_lib/briefPdf.js";

const EMAIL_RE = /^[^@\s<>"']{1,64}@[^@\s<>"']{1,190}\.[A-Za-z]{2,}$/;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const DAILY_CAP = Number(process.env.SEND_DAILY_CAP || 30);
const PER_IP = { max: 3, windowMs: 10 * 60 * 1000 };
const hits = new Map();
let day = { key: "", count: 0 };

const clean = (s, max) => String(s ?? "").replace(URL_RE, "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

function parseVals(v) {
  const o = {};
  FIELDS.forEach((f) => { o[f] = NUMERIC.has(f) ? parseFloat(String(v?.[f] ?? "")) : String(v?.[f] ?? "").trim(); });
  return o;
}

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < PER_IP.windowMs);
  if (list.length >= PER_IP.max) return true;
  list.push(now); hits.set(ip, list);
  const today = new Date().toISOString().slice(0, 10);
  if (day.key !== today) day = { key: today, count: 0 };
  if (day.count >= DAILY_CAP) return true;
  day.count += 1;
  return false;
}

export default async function handler(req, res) {
  const json = (status, body) => { res.status(status).setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };
  if (req.method !== "POST") return json(405, { code: "method_not_allowed" });

  const user = process.env.GMAIL_USER, pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  if (!user || !pass) return json(503, { code: "not_configured" });

  // Same-site only: the request must come from a page on this host.
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const origin = req.headers.origin || req.headers.referer || "";
  try { if (!origin || new URL(origin).host !== host) return json(403, { code: "forbidden" }); } catch { return json(403, { code: "forbidden" }); }

  const b = req.body || {};
  if (b.company) return json(200, { ok: true }); // honeypot: bots fill hidden fields; pretend success
  const to = String(b.email || "").trim();
  const name = clean(b.name, 60);
  if (!name || !EMAIL_RE.test(to)) return json(400, { code: "bad_request" });

  // Recalculate the deal on the server.
  const D = parseVals(b.vals || {});
  const M = calc(D);
  if (!M) return json(400, { code: "bad_request" });

  // The note: prepared brief for an unedited sample deal; otherwise the live note, capped and without links.
  const ex = String(b.example || "");
  const isSample = EXAMPLES[ex] && SAMPLE_BRIEFS[ex] && FIELDS.every((f) => String(b.vals?.[f] ?? "") === String(EXAMPLES[ex][f] ?? ""));
  const note = isSample ? SAMPLE_BRIEFS[ex] : String(b.text || "").replace(URL_RE, "").slice(0, 8000);
  const r = parseReport(note);
  if (!r.verdict) return json(400, { code: "bad_request" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return json(429, { code: "rate_limited" });

  const dealName = clean(D.name, 120) || "your deal";
  const shortName = dealName.split(" · ")[0];
  const market = clean(D.market, 80);
  const flags = (r.sections.flags?.items || []).map(parseFlag);
  const kpis = [["Going-in cap", pct(M.cap, 2)], ["DSCR", isFinite(M.dscr) ? M.dscr.toFixed(2) + "x" : "no debt"], ["Debt yield", isFinite(M.dy) ? pct(M.dy, 1) : "–"], ["Levered IRR", isFinite(M.irr) ? pct(M.irr, 1) : "n/m"]];
  const baseUrl = "https://" + host;
  const subject = `Ellie Jr.'s first pass on ${shortName}`;

  const { html, text } = buildEmail({
    subject, baseUrl,
    firstName: name.split(/\s+/)[0],
    dealName, market,
    verdict: r.verdict.label, verdictReason: r.verdict.why,
    kpis,
    redFlagTitle: flags[0]?.title || "", redFlagBody: [flags[0]?.body, flags[0]?.check && "Check: " + flags[0].check].filter(Boolean).join(" "),
    bookCallUrl: `mailto:${user}?subject=${encodeURIComponent("Book a call: 5D Deal Screen")}`,
    unsubscribeUrl: `mailto:${user}?subject=${encodeURIComponent("Unsubscribe: 5D Deal Screen")}`,
  });

  const pdf = await buildBriefPdf({
    date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    dealName,
    meta: [clean(D.asset, 40), market, isFinite(D.size) ? D.size.toLocaleString("en-GB") + " " + clean(D.unit, 10) : ""].filter(Boolean).join(" · "),
    kpis: [["Price", money(D.price, D.ccy)], ["Going-in cap", pct(M.cap, 2)], ["DSCR", isFinite(M.dscr) ? M.dscr.toFixed(2) + "x" : "no debt"], ["Leverage spread", bps(M.spread)], ["Levered IRR", isFinite(M.irr) ? pct(M.irr, 1) : "n/m"], ["Equity multiple", M.em.toFixed(2) + "x"]],
    verdict: r.verdict.label, verdictRag: r.verdict.rag, verdictReason: r.verdict.why,
    numbers: (r.sections.numbers?.items || []).map(parseNumber),
    flags,
    questions: r.sections.questions?.items || [],
    dataroom: r.sections.dataroom?.items || [],
    mind: r.sections.mind ? [...r.sections.mind.text, ...r.sections.mind.items].join(" ") : "",
  });

  try {
    const tx = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await tx.sendMail({
      from: { name: "Fifth Dimension · Deal Screen", address: user },
      to, replyTo: user, subject, html, text,
      attachments: [{ filename: "IC-first-pass.pdf", content: Buffer.from(pdf), contentType: "application/pdf" }],
    });
    return json(200, { ok: true });
  } catch (e) {
    console.error("send failed:", e && e.message);
    return json(502, { code: "send_failed" });
  }
}

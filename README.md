# 5D Deal Screen (React + Vite, deployed on Vercel)

React rebuild of the Deal Screen prototype and its follow-up email.

| Route    | What it is                                                    |
|----------|---------------------------------------------------------------|
| `/`      | Deal Screen: inputs, debt metrics, IRR sensitivity, Ellie's first pass, lead form, Solo dialog |
| `/email` | Follow-up email preview (HubSpot template, Austin sample values) |

## AI (Ellie)

The prototype used the Claude artifact runtime. Here the browser calls `/api/ellie`, a Vercel Edge Function
(`api/ellie.js`) that holds the prompts and calls the Anthropic API.

Set in Vercel → Project → Settings → Environment Variables:

- `ANTHROPIC_API_KEY` (required for the first pass and teaser extraction)
- `ANTHROPIC_MODEL` (optional, defaults to `claude-sonnet-5-5`)

Redeploy after adding them. Without a key, the numbers and sensitivity still work and the AI buttons show a
"not switched on" message.

## Local dev

```bash
npm install
npm run dev          # front end only
npx vercel dev       # front end + /api/ellie (needs .env.local with ANTHROPIC_API_KEY)
```

## Still mocked (as in the prototype)

- Lead capture: nothing is stored or sent; production should post to HubSpot.
- Email delivery and PDF: previews only.
- "Book a call" link in the email is a placeholder (`#`).

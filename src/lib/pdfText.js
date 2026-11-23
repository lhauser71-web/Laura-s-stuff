// Read a PDF's text in the browser, so large brochures never have to be uploaded whole.
// (Vercel caps uploads to the site's server at 4.5 MB; the text of a 20-page OM is usually ~20 KB.)
// Loaded on demand so the PDF reader only downloads when someone actually uploads a PDF.

const MAX_PAGES = 60;

export async function pdfToText(file, onPage) {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = Math.min(doc.numPages, MAX_PAGES);
  const out = [];
  for (let i = 1; i <= pages; i++) {
    if (onPage) onPage(i, pages);
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    let line = "", lastY = null;
    const lines = [];
    for (const it of tc.items) {
      const y = it.transform ? Math.round(it.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) { lines.push(line.trim()); line = ""; }
      line += (line && !line.endsWith(" ") && it.str && !it.str.startsWith(" ") ? " " : "") + it.str;
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    const text = lines.filter(Boolean).join("\n");
    if (text) out.push(`--- page ${i} ---\n${text}`);
  }
  doc.destroy();
  return { text: out.join("\n\n"), pages: doc.numPages, read: pages };
}

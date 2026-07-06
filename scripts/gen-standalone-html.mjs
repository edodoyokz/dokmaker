import { writeFile } from "node:fs/promises";
import { GOCAR_RECEIPT_HTML_TEMPLATE } from "../src/modules/documents/gocar-receipt-template.ts";
import {
  getDefaultGoCarReceiptContent,
} from "../src/modules/documents/gocar-receipt-content.schema.ts";
import { buildGoCarReceiptRenderContext } from "../src/modules/documents/gocar-receipt-render-context.ts";

const content = getDefaultGoCarReceiptContent();
const ctx = buildGoCarReceiptRenderContext(content);
const body = GOCAR_RECEIPT_HTML_TEMPLATE.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
  return ctx[path.trim()] ?? "";
});

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>
${body}
</body>
</html>`;

await writeFile("/tmp/dokmaker-standalone.html", html);
console.log("Written /tmp/dokmaker-standalone.html", html.length, "bytes");

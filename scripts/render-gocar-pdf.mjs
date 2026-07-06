// Render the canonical GoCar template to PDF using the real engine, then
// save PNGs of both pages so they can be diffed against the reference PDF.
import { writeFile, mkdir } from "node:fs/promises";
import { generateInvoicePdf } from "../src/lib/pdf/generator.ts";
import {
  getDefaultGoCarReceiptContent,
} from "../src/modules/documents/gocar-receipt-content.schema.ts";
import { GOCAR_RECEIPT_HTML_TEMPLATE } from "../src/modules/documents/gocar-receipt-template.ts";

const out = process.argv[2] ?? "/tmp/dokmaker-render.pdf";
const pdf = await generateInvoicePdf(
  getDefaultGoCarReceiptContent(),
  {
    template: {
      htmlTemplate: GOCAR_RECEIPT_HTML_TEMPLATE,
      documentType: "gocar_receipt",
    },
  }
);
await mkdir(out.substring(0, out.lastIndexOf("/")) || ".", { recursive: true });
await writeFile(out, pdf);
console.log("wrote", out, pdf.length, "bytes");

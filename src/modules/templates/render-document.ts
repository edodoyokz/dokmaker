import {
  renderDocumentTemplateHtml,
  type RenderDocumentTemplateHtmlInput,
} from "./render-template";

export type RenderDocumentHtmlInput = RenderDocumentTemplateHtmlInput;

const DOCUMENT_CSS = `
@page { size: A4; margin: 0; }
html, body { margin: 0; padding: 0; }
*, *::before, *::after { box-sizing: border-box; }
.dokmaker-preview-watermark {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
  overflow: hidden;
  color: transparent;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='340' height='220'%3E%3Ctext x='170' y='110' font-family='Arial,Helvetica,sans-serif' font-size='32' font-weight='700' fill='%23dc2626' fill-opacity='0.13' letter-spacing='4' transform='rotate(-30 170 110)' text-anchor='middle'%3EPREVIEW%3C/text%3E%3C/svg%3E");
  background-repeat: repeat;
}
.dokmaker-preview-meta {
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 2147483647;
  max-width: min(60%, 280px);
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(220, 38, 38, 0.92);
  color: #fff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.dokmaker-preview-meta p { margin: 0; }
`;

export function renderDocumentHtml({
  htmlTemplate,
  documentType,
  content,
  mode,
  previewMeta,
}: RenderDocumentHtmlInput): string {
  const body = renderDocumentTemplateHtml({
    htmlTemplate,
    documentType,
    content,
    mode,
    previewMeta,
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${DOCUMENT_CSS}</style>
</head>
<body>${body}</body>
</html>`;
}


"use client";

import { useEffect, useState } from "react";
import { renderDocumentHtml } from "@/modules/templates/render-document";
import { isSupportedDocumentType } from "@/modules/documents/document-type-registry";
import type { DocumentType } from "@/modules/documents/types";

interface Props {
  htmlTemplate: string;
  documentType: string;
  content: unknown;
  previewMeta: {
    email: string;
    timestamp: string;
    versionId: string;
  };
  /** Required for gocar_receipt stamp preview (same PDF path as final download). */
  invoiceId?: string;
}

function GoCarStampPreview({ invoiceId }: { invoiceId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setSrc(null);
        const res = await fetch(`/api/invoices/${invoiceId}/preview`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Gagal memuat preview PDF");
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Gagal memuat preview");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoiceId]);

  if (error) {
    return (
      <div className="flex h-[400px] w-[794px] items-center justify-center bg-zinc-50 px-6 text-center text-sm text-rose-600">
        {error}
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex h-[400px] w-[794px] items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        Memuat preview PDF…
      </div>
    );
  }

  // Same stamp engine as final download; browser PDF viewer for 2×A4.
  return (
    <iframe
      title="Preview dokumen GoCar"
      src={src}
      className="block h-[2246px] w-[794px] border-0 bg-white"
    />
  );
}

export default function TemplatePreview({
  htmlTemplate,
  documentType,
  content,
  previewMeta,
  invoiceId,
}: Props) {
  // GoCar final + preview share the stamp path so logo/layout match the ref PDF.
  if (documentType === "gocar_receipt" && invoiceId) {
    return <GoCarStampPreview invoiceId={invoiceId} />;
  }

  const html = renderDocumentHtml({
    htmlTemplate,
    documentType: (isSupportedDocumentType(documentType)
      ? documentType
      : "invoice") as DocumentType,
    content,
    mode: "preview",
    previewMeta,
  });

  return (
    <iframe
      title="Preview dokumen"
      srcDoc={html}
      sandbox=""
      className={`block ${documentType === "gocar_receipt" ? "h-[2246px]" : "h-[1123px]"} w-[794px] border-0 bg-white`}
    />
  );
}

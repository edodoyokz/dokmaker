import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import { ArrowLeft, Sparkles, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requireUser();
  const { templateId } = await params;

  const template = await prisma.invoiceTemplate.findUnique({
    where: { id: templateId, status: "active" },
  });

  if (!template) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/app/templates"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Katalog Template
        </Link>
      </div>

      {/* Detail Layout */}
      <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
          
          {/* Left: Template Preview Image */}
          <div className="w-full md:w-1/2 aspect-[4/3] bg-zinc-950/80 rounded-xl border border-zinc-850 overflow-hidden flex items-center justify-center relative shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent z-10 pointer-events-none" />
            
            {template.thumbnailUrl ? (
              <Image
                src={template.thumbnailUrl}
                alt={template.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              // Document Fallback Mockup
              <div className="w-[80%] h-[80%] bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2.5 opacity-80 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="h-4 w-12 rounded bg-indigo-500/20" />
                  <div className="h-3 w-8 rounded bg-zinc-800" />
                </div>
                <div className="h-2 w-full rounded bg-zinc-800" />
                <div className="h-2 w-3/4 rounded bg-zinc-800" />
                <div className="border-t border-zinc-800/80 pt-2 space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-2 w-16 rounded bg-zinc-850" />
                    <div className="h-2 w-6 rounded bg-zinc-850" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-2 w-12 rounded bg-zinc-850" />
                    <div className="h-2 w-6 rounded bg-zinc-850" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Overlaid Badge */}
            <div className="absolute top-3 right-3 z-20">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-[10px] font-bold text-indigo-400 backdrop-blur-sm">
                <Sparkles className="h-3 w-3" /> Ready to Use
              </span>
            </div>
          </div>

          {/* Right: Template Details & Call to Action */}
          <div className="w-full md:w-1/2 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-mono font-bold">Template Resmi</span>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-100 mt-1">
                  {template.name}
                </h1>
              </div>

              {template.description && (
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {template.description}
                </p>
              )}

              {/* Price Details Card */}
              <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Biaya Cetak Dokumen</span>
                <p className="text-lg font-bold text-zinc-200">
                  Rp{template.price.toLocaleString("id-ID")} <span className="text-xs font-normal text-zinc-500">/ final PDF</span>
                </p>
                <p className="text-[10px] text-zinc-500 leading-relaxed pt-1.5 border-t border-zinc-900 mt-1.5">
                  Pembuatan draf dan pratinjau gratis (ber-watermark). Biaya hanya dikenakan saat Anda ingin mengunduh PDF final yang bersih dan sah.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-zinc-800/60">
              <Link
                href={`/app/invoices/new?templateId=${template.id}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 transition-all text-center"
              >
                <Plus className="h-4.5 w-4.5" /> Gunakan Template Ini
              </Link>
              
              <Link
                href="/app/templates"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 hover:bg-zinc-900/60 px-4 py-3 text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-all text-center"
              >
                Pilih Template Lain
              </Link>
            </div>

          </div>

        </CardContent>
      </Card>
    </div>
  );
}

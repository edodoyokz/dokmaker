import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Layers, Sparkles, ArrowRight } from "lucide-react";

export default async function TemplatesPage() {
  await requireUser();

  const templates = await prisma.invoiceTemplate.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-100">
          Pilih template <Layers className="h-5 w-5 text-indigo-400" />
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Template resmi platform — invoice, receipt, dan lainnya.
        </p>
      </div>

      {templates.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-2xl">
          <CardContent className="py-12 text-center flex flex-col items-center justify-center">
            <Layers className="h-10 w-10 text-zinc-700 mb-2" />
            <p className="text-sm font-semibold text-zinc-300">Belum Ada Template Tersedia</p>
            <p className="text-xs text-zinc-500 mt-1">Platform admin akan segera menambahkan template baru.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="overflow-hidden border-zinc-800/80 bg-zinc-900/40 hover:border-indigo-500/50 backdrop-blur-md rounded-2xl transition-all hover:-translate-y-1 group relative flex flex-col justify-between"
            >
              {/* Card Preview Image */}
              <div className="aspect-[4/3] bg-zinc-950/80 flex items-center justify-center relative border-b border-zinc-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent z-10 pointer-events-none" />
                
                {template.thumbnailUrl ? (
                  <Image
                    src={template.thumbnailUrl}
                    alt={template.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  // Document Fallback Mockup
                  <div className="w-[80%] h-[80%] bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2.5 opacity-70 group-hover:opacity-95 group-hover:scale-[1.02] transition-all duration-300 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div className="h-4 w-12 rounded bg-indigo-500/20" />
                      <div className="h-3 w-8 rounded bg-zinc-800" />
                    </div>
                    <div className="h-2 w-full rounded bg-zinc-800" />
                    <div className="h-2 w-3/4 rounded bg-zinc-800" />
                    <div className="border-t border-zinc-800/80 pt-2 space-y-1.5">
                      <div className="flex justify-between">
                        <div className="h-2 w-16 rounded bg-zinc-800" />
                        <div className="h-2 w-6 rounded bg-zinc-800" />
                      </div>
                      <div className="flex justify-between">
                        <div className="h-2 w-12 rounded bg-zinc-800" />
                        <div className="h-2 w-6 rounded bg-zinc-800" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Overlaid Badge */}
                <div className="absolute top-3 right-3 z-20">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-[10px] font-bold text-indigo-400 backdrop-blur-sm">
                    <Sparkles className="h-3 w-3" /> Aktif
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="text-base font-bold text-zinc-100 line-clamp-1">{template.name}</CardTitle>
                  {template.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Biaya Cetak</span>
                    <p className="text-xs font-semibold text-zinc-200">Rp10.000 / Final PDF</p>
                  </div>
                  
                  <Link
                    href={`/app/templates/${template.id}`}
                    className={cn(
                      buttonVariants({ size: "sm" }), 
                      "bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-200 border-0 rounded-xl transition-all shadow-sm flex items-center gap-1"
                    )}
                  >
                    Gunakan <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { requireUser } from "@/modules/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function TemplatesPage() {
  await requireUser();

  const templates = await prisma.invoiceTemplate.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Template Invoice</h1>
        <p className="text-muted-foreground">
          Pilih template untuk membuat invoice
        </p>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Belum ada template tersedia
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {template.thumbnailUrl ? (
                  <Image
                    src={template.thumbnailUrl}
                    alt={template.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-12 w-12 text-muted-foreground"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-1">{template.name}</CardTitle>
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Invoice Template
                  </span>
                  <Link
                    href={`/app/templates/${template.id}`}
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    Gunakan
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

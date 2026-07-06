import { requireUser } from "@/modules/auth/session";
import { getAiInvoiceOutputForDownload } from "@/modules/ai-invoice/service";
import { safeApiError } from "@/lib/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const image = await getAiInvoiceOutputForDownload(user.id, id);
    return new Response(new Uint8Array(image.body), {
      headers: {
        "Content-Type": image.contentType,
        "Content-Disposition": `attachment; filename="ai-invoice-${id}.${image.contentType.includes("png") ? "png" : "jpg"}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 404;
    return Response.json({ error: safeApiError(error) }, { status });
  }
}

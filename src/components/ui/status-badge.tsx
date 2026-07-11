import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  paid: {
    label: "Lunas",
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  },
  unpaid: {
    label: "Belum bayar",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  },
  processing_payment: {
    label: "Diproses",
    className: "border-indigo-500/25 bg-indigo-500/10 text-indigo-400",
  },
  draft: {
    label: "Draf",
    className: "border-zinc-700 bg-zinc-900 text-zinc-400",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const item = MAP[status] ?? {
    label: status,
    className: "border-zinc-700 bg-zinc-900 text-zinc-400",
  };
  return (
    <Badge
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-medium",
        item.className,
        className
      )}
    >
      {item.label}
    </Badge>
  );
}

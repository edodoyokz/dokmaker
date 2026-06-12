"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  templateId: string;
  currentStatus: "active" | "inactive";
}

export default function ToggleTemplateButton({
  templateId,
  currentStatus,
}: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const newStatus = currentStatus === "active" ? "inactive" : "active";
  const label = currentStatus === "active" ? "Nonaktifkan" : "Aktifkan";

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-md px-4 py-2 text-sm text-white disabled:opacity-50 ${
        newStatus === "active"
          ? "bg-green-600 hover:bg-green-700"
          : "bg-red-600 hover:bg-red-700"
      }`}
    >
      {loading ? "Menyimpan..." : label}
    </button>
  );
}

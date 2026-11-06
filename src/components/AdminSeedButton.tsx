"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSeedButton() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    if (!confirm("Load/Reset Synthetic Demo Data? This will recreate demo patient Asha R. and seed the 3 clinical visits.")) {
      return;
    }

    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Synthetic data and sample PDFs generated successfully.");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <button
      onClick={handleSeed}
      disabled={seeding}
      className="px-4 py-2 rounded-lg border border-line bg-surface text-ink font-semibold text-xs hover:bg-soft/20 transition-colors shadow-sm disabled:opacity-50"
    >
      {seeding ? "Populating Seed Data..." : "Load Synthetic Demo Data"}
    </button>
  );
}

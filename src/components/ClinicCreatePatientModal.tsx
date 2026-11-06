"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IconClose } from "./icons";

export function ClinicCreatePatientModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mrn, setMrn] = useState("");
  const [dob, setDob] = useState("1965-04-12");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mrn, dob }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOpen(false);
      setName("");
      setMrn("");
      router.refresh();
      router.push(`/clinic/patients/${data.patient.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-accent text-accent-ink font-semibold text-xs hover:opacity-95 transition-opacity shadow-sm"
      >
        + New Patient Record
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="w-full max-w-md bg-surface border border-line rounded-xl p-6 surface-elevated space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 id="modal-title" className="font-serif text-lg font-bold text-ink">
                Create Synthetic Patient Record
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-soft/30 text-ink"
                aria-label="Close dialog"
              >
                <IconClose size={18} />
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded bg-red-50 border border-red-300 text-red-900 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                  Patient Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-lg border border-line bg-surface text-xs text-ink focus:ring-2 focus:ring-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                  Synthetic Record Number (MRN)
                </label>
                <input
                  type="text"
                  required
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  placeholder="e.g. SYN-9901"
                  className="w-full px-3 py-2 rounded-lg border border-line bg-surface text-xs text-ink focus:ring-2 focus:ring-focus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-line bg-surface text-xs text-ink focus:ring-2 focus:ring-focus"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg border border-line text-xs font-medium text-ink hover:bg-soft/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-accent text-accent-ink text-xs font-semibold hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

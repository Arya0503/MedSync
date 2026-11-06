"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IconClose, IconFileText } from "./icons";

interface ClinicUploadDocumentModalProps {
  patientId: string;
  visits: Array<{ id: string; facility: string; visitDate: string }>;
}

export function ClinicUploadDocumentModal({ patientId, visits }: ClinicUploadDocumentModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [visitId, setVisitId] = useState(visits[0]?.id || "");
  const [isNewVisit, setIsNewVisit] = useState(visits.length === 0);
  const [facility, setFacility] = useState("");
  const [visitType, setVisitType] = useState("Discharge Summary");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a document file (PDF, PNG, or JPG).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let targetVisitId = visitId;

      if (isNewVisit || !targetVisitId) {
        // Create visit first
        const vRes = await fetch(`/api/patients/${patientId}/visits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ facility, visitType, visitDate }),
        });
        const vData = await vRes.json();
        if (!vRes.ok) throw new Error(vData.error);
        targetVisitId = vData.visit.id;
      }

      // Upload file multipart
      const formData = new FormData();
      formData.append("file", file);

      const upRes = await fetch(`/api/visits/${targetVisitId}/documents`, {
        method: "POST",
        body: formData,
      });

      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error);

      setOpen(false);
      router.refresh();
      router.push(`/clinic/documents/${upData.document.id}`);
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
        className="px-4 py-2 rounded-lg bg-accent text-accent-ink font-semibold text-xs hover:opacity-95 transition-opacity shadow-sm flex items-center gap-1.5"
      >
        <IconFileText size={14} /> Upload Clinical Document
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
            className="w-full max-w-lg bg-surface border border-line rounded-xl p-6 surface-elevated space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 id="upload-modal-title" className="font-serif text-lg font-bold text-ink">
                Upload Document for Local Extraction
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-soft/30 text-ink"
                aria-label="Close upload dialog"
              >
                <IconClose size={18} />
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded bg-red-50 border border-red-300 text-red-900 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              {visits.length > 0 && (
                <div className="flex items-center gap-4 text-xs font-semibold text-ink">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isNewVisit}
                      onChange={() => setIsNewVisit(false)}
                    />
                    Attach to Existing Visit
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={isNewVisit}
                      onChange={() => setIsNewVisit(true)}
                    />
                    New Visit
                  </label>
                </div>
              )}

              {!isNewVisit && visits.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                    Select Clinical Visit
                  </label>
                  <select
                    value={visitId}
                    onChange={(e) => setVisitId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line bg-surface text-xs text-ink"
                  >
                    {visits.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.facility} ({v.visitDate})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-bg/50 border border-line">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                      Facility / Hospital Name
                    </label>
                    <input
                      type="text"
                      required
                      value={facility}
                      onChange={(e) => setFacility(e.target.value)}
                      placeholder="e.g. Metro Specialty Hospital"
                      className="w-full px-3 py-1.5 rounded border border-line bg-surface text-xs text-ink"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                        Visit Type
                      </label>
                      <input
                        type="text"
                        required
                        value={visitType}
                        onChange={(e) => setVisitType(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-line bg-surface text-xs text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                        Visit Date
                      </label>
                      <input
                        type="date"
                        required
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded border border-line bg-surface text-xs text-ink"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                  Choose Document File (PDF, PNG, JPG — Max 10 MB)
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-ink file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-soft/40 file:text-accent hover:file:bg-soft/60"
                />
                <p className="text-[11px] text-ink-soft mt-1">
                  Document will be processed completely locally using on-premise OCR and deterministic parsing.
                </p>
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
                  disabled={loading || !file}
                  className="px-4 py-2 rounded-lg bg-accent text-accent-ink text-xs font-semibold hover:opacity-95 disabled:opacity-50"
                >
                  {loading ? "Reading locally..." : "Upload & Extract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

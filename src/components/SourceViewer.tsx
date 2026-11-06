"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IconZoomIn, IconZoomOut, IconCheckCircle, IconFileText, IconArrowLeft, IconArrowRight } from "./icons";

interface DocumentLine {
  id: string;
  page: number;
  lineIndex: number;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  ocrConfidence: number | null;
}

interface ExtractedField {
  id: string;
  fieldName: string;
  rawText: string;
  lineId: string | null;
  confidence: number;
  needsReview: boolean;
  correctedFrom: string | null;
}

interface MedicationEntry {
  id: string;
  drugNameRaw: string;
  strengthRaw: string | null;
  formRaw: string | null;
  instructionRaw: string | null;
  confirmed: boolean;
  fields: ExtractedField[];
}

interface SourceViewerProps {
  document: {
    id: string;
    fileName: string;
    mimeType: string;
    status: string;
    pageCount: number;
    patientId: string;
    patientName: string;
    facility: string;
  };
  lines: DocumentLine[];
  entries: MedicationEntry[];
  initialLineId?: string;
  canEdit: boolean;
}

export function SourceViewer({
  document,
  lines,
  entries: initialEntries,
  initialLineId,
  canEdit,
}: SourceViewerProps) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(
    initialLineId || (lines[0]?.id ?? null)
  );
  const [zoom, setZoom] = useState(1.0);
  const [confirming, setConfirming] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ drugName: "", strength: "", form: "" });

  // Manual entry modal state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ drugName: "", strength: "", form: "Tablet", instruction: "" });

  const selectedLine = lines.find((l) => l.id === selectedLineId);
  const selectedLineIndex = lines.findIndex((l) => l.id === selectedLineId);

  const handlePrevLine = () => {
    if (selectedLineIndex > 0) {
      setSelectedLineId(lines[selectedLineIndex - 1].id);
    }
  };

  const handleNextLine = () => {
    if (selectedLineIndex < lines.length - 1) {
      setSelectedLineId(lines[selectedLineIndex + 1].id);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.0, z + 0.2));
  const handleZoomOut = () => setZoom((z) => Math.max(0.6, z - 0.2));
  const handleResetZoom = () => setZoom(1.0);

  const handleConfirmDocument = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Document confirmed. ${data.detectedDiscrepancies} reconciliation discrepancies evaluated.`);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleSaveCorrection = async (entryId: string) => {
    try {
      const res = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugNameRaw: editForm.drugName,
          strengthRaw: editForm.strength,
          formRaw: editForm.form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEntries(
        entries.map((e) => (e.id === entryId ? { ...e, ...data.entry } : e))
      );
      setEditingEntryId(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleManualEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/documents/${document.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugName: manualForm.drugName,
          strengthRaw: manualForm.strength,
          formRaw: manualForm.form,
          instructionRaw: manualForm.instruction,
          lineId: selectedLineId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setEntries([...entries, data.entry]);
      setManualModalOpen(false);
      setManualForm({ drugName: "", strength: "", form: "Tablet", instruction: "" });
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface border border-line text-accent">
              Doc Status: {document.status}
            </span>
            <span className="text-xs text-ink-soft">
              {document.facility} • {document.patientName}
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink mt-1 flex items-center gap-2">
            <IconFileText size={22} className="text-accent" />
            {document.fileName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setManualModalOpen(true)}
              className="px-3 py-2 rounded-lg border border-line text-xs font-semibold text-ink hover:bg-soft/30 transition-colors"
            >
              + Manual Entry Fallback
            </button>
          )}

          {canEdit && document.status !== "CONFIRMED" && (
            <button
              onClick={handleConfirmDocument}
              disabled={confirming}
              className="px-4 py-2 rounded-lg bg-accent text-accent-ink font-semibold text-xs hover:opacity-95 transition-opacity shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <IconCheckCircle size={14} />
              {confirming ? "Confirming & Detecting..." : "Confirm All Extracted Entries"}
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Source Visual on Left, Extracted Data on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Source Document Viewer & Position Highlighting (7 cols) */}
        <section
          className="lg:col-span-7 surface-solid rounded-xl border border-line p-4 space-y-4"
          aria-label="Document Source Canvas and Line Navigator"
        >
          {/* Zoom and Line Navigation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-bg/80 rounded-lg border border-line text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded hover:bg-surface border border-line"
                aria-label="Zoom in on document"
                title="Zoom in"
              >
                <IconZoomIn size={16} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded hover:bg-surface border border-line"
                aria-label="Zoom out on document"
                title="Zoom out"
              >
                <IconZoomOut size={16} />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 py-1 rounded hover:bg-surface border border-line text-[11px]"
              >
                Fit ({Math.round(zoom * 100)}%)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-ink-soft">
                Line {lines.length > 0 ? selectedLineIndex + 1 : 0} of {lines.length}
              </span>
              <button
                onClick={handlePrevLine}
                disabled={selectedLineIndex <= 0}
                className="p-1.5 rounded hover:bg-surface border border-line disabled:opacity-30"
                aria-label="Navigate to previous source line"
              >
                <IconArrowLeft size={14} />
              </button>
              <button
                onClick={handleNextLine}
                disabled={selectedLineIndex >= lines.length - 1}
                className="p-1.5 rounded hover:bg-surface border border-line disabled:opacity-30"
                aria-label="Navigate to next source line"
              >
                <IconArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Visual Document Container */}
          <div className="relative overflow-auto max-h-[580px] bg-neutral-900 rounded-lg border border-line p-4 flex justify-center">
            <div
              className="relative bg-white shadow-2xl transition-transform origin-top"
              style={{
                width: `${595 * zoom}px`,
                minHeight: `${842 * zoom}px`,
              }}
            >
              {/* Native Document Embed */}
              <iframe
                src={`/api/documents/${document.id}/file`}
                className="w-full h-full border-0 absolute inset-0 pointer-events-none"
                title={`Visual rendering of ${document.fileName}`}
              />

              {/* Distinctive Labelled Outline Box for Matched Line */}
              {selectedLine && (
                <div
                  className="absolute pointer-events-none transition-all duration-200"
                  style={{
                    left: `${selectedLine.x * 100}%`,
                    top: `${selectedLine.y * 100}%`,
                    width: `${selectedLine.w * 100}%`,
                    height: `${Math.max(selectedLine.h * 100, 3)}%`,
                    border: "3px solid #147A5F",
                    backgroundColor: "rgba(168, 240, 220, 0.35)",
                    boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.9)",
                  }}
                  role="region"
                  aria-label={`Matched Line outline: ${selectedLine.text}`}
                >
                  <span className="absolute -top-6 left-0 bg-[#147A5F] text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shadow">
                    [Matched Source Line #{selectedLine.lineIndex}]
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Text Line List with Accessible "Matched line" Indicator */}
          <div className="space-y-2 pt-2">
            <h3 className="font-serif font-bold text-sm text-ink">
              Document Text Lines (Local Extraction)
            </h3>
            <div
              className="max-h-48 overflow-y-auto space-y-1 p-2 bg-bg/50 rounded-lg border border-line text-xs font-mono"
              role="list"
              aria-label="Extracted document lines"
            >
              {lines.map((l) => {
                const isSelected = l.id === selectedLineId;
                return (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLineId(l.id)}
                    aria-current={isSelected ? "true" : undefined}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition-colors flex items-start justify-between gap-2 ${
                      isSelected
                        ? "bg-accent text-accent-ink font-bold shadow-sm"
                        : "hover:bg-soft/30 text-ink"
                    }`}
                  >
                    <span>
                      {isSelected ? "[Matched line] " : ""}
                      {l.lineIndex}. {l.text}
                    </span>
                    <span className="text-[10px] opacity-75 shrink-0">
                      p.{l.page} (conf: {l.ocrConfidence ? Math.round(l.ocrConfidence * 100) : 95}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right: Extracted Structured Records (5 cols) */}
        <section
          className="lg:col-span-5 surface-solid rounded-xl border border-line p-5 space-y-4"
          aria-label="Structured Medication Entries"
        >
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">
              Structured Extractions ({entries.length})
            </h2>
            <p className="text-xs text-ink-soft">
              Every value links back to its exact coordinate in the source above.
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="p-8 text-center text-ink-soft border border-dashed border-line rounded-lg">
              <p className="font-medium text-ink">No medication entries extracted yet.</p>
              <p className="text-xs mt-1">
                OCR may have produced unformatted lines. Use the "Manual Entry Fallback" button to add medicines from the text lines.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
                const isEditing = editingEntryId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      entry.confirmed
                        ? "bg-bg/40 border-line"
                        : "bg-amber-50/50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800"
                    }`}
                  >
                    {isEditing ? (
                      /* Inline Correction Form */
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-ink">Drug Name</label>
                          <input
                            type="text"
                            value={editForm.drugName}
                            onChange={(e) => setEditForm({ ...editForm, drugName: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-line rounded bg-surface text-ink"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-ink">Strength</label>
                            <input
                              type="text"
                              value={editForm.strength}
                              onChange={(e) => setEditForm({ ...editForm, strength: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-line rounded bg-surface text-ink"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-ink">Form</label>
                            <input
                              type="text"
                              value={editForm.form}
                              onChange={(e) => setEditForm({ ...editForm, form: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-line rounded bg-surface text-ink"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingEntryId(null)}
                            className="px-2.5 py-1 text-xs border border-line rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCorrection(entry.id)}
                            className="px-2.5 py-1 text-xs bg-accent text-accent-ink rounded font-semibold"
                          >
                            Save Correction
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-serif font-bold text-base text-ink">
                              {entry.drugNameRaw}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-xs font-semibold text-accent">
                                {entry.strengthRaw || "No strength"}
                              </span>
                              <span className="text-[11px] text-ink-soft uppercase font-medium">
                                • {entry.formRaw || "Tablet"}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              entry.confirmed
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {entry.confirmed ? "Confirmed" : "Needs Review"}
                          </span>
                        </div>

                        {/* Verbatim Instruction */}
                        <div className="p-2.5 rounded bg-surface border border-line text-xs font-medium text-ink">
                          <span className="block text-[10px] font-bold uppercase text-ink-soft mb-0.5">
                            Verbatim Instruction
                          </span>
                          {entry.instructionRaw ? `"${entry.instructionRaw}"` : <span className="italic text-ink-soft">Empty / Unrecorded</span>}
                        </div>

                        {/* Source Field Links */}
                        <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {entry.fields.map((f) => (
                              <button
                                key={f.id}
                                onClick={() => f.lineId && setSelectedLineId(f.lineId)}
                                className="font-mono text-[10px] text-accent hover:underline flex items-center gap-0.5"
                                title={`Confidence: ${(f.confidence * 100).toFixed(0)}%`}
                              >
                                <span>📍 {f.fieldName} ({(f.confidence * 100).toFixed(0)}%)</span>
                              </button>
                            ))}
                          </div>

                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingEntryId(entry.id);
                                setEditForm({
                                  drugName: entry.drugNameRaw,
                                  strength: entry.strengthRaw || "",
                                  form: entry.formRaw || "Tablet",
                                });
                              }}
                              className="text-xs text-accent font-semibold hover:underline"
                            >
                              Correct
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Manual Entry Fallback Modal */}
      {manualModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setManualModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-modal-title"
            className="w-full max-w-md bg-surface border border-line rounded-xl p-6 surface-elevated space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 id="manual-modal-title" className="font-serif text-lg font-bold text-ink">
                Manual Medication Entry Fallback
              </h3>
              <button onClick={() => setManualModalOpen(false)} className="p-1 rounded text-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleManualEntrySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-ink mb-1">Medication Name</label>
                <input
                  type="text"
                  required
                  value={manualForm.drugName}
                  onChange={(e) => setManualForm({ ...manualForm, drugName: e.target.value })}
                  placeholder="e.g. Metformin"
                  className="w-full px-3 py-1.5 rounded border border-line bg-surface text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-ink mb-1">Strength</label>
                  <input
                    type="text"
                    required
                    value={manualForm.strength}
                    onChange={(e) => setManualForm({ ...manualForm, strength: e.target.value })}
                    placeholder="e.g. 500 mg"
                    className="w-full px-3 py-1.5 rounded border border-line bg-surface text-ink"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-ink mb-1">Form</label>
                  <input
                    type="text"
                    required
                    value={manualForm.form}
                    onChange={(e) => setManualForm({ ...manualForm, form: e.target.value })}
                    placeholder="e.g. Tablet"
                    className="w-full px-3 py-1.5 rounded border border-line bg-surface text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-ink mb-1">
                  Verbatim Instruction as Written
                </label>
                <textarea
                  rows={2}
                  value={manualForm.instruction}
                  onChange={(e) => setManualForm({ ...manualForm, instruction: e.target.value })}
                  placeholder="e.g. 1 tablet twice daily after meals"
                  className="w-full px-3 py-1.5 rounded border border-line bg-surface text-ink"
                />
              </div>

              <div className="p-2 rounded bg-bg text-[11px] text-ink-soft">
                Target Line: Line {selectedLineIndex + 1} will be linked as source verification.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-line"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-accent text-accent-ink font-semibold"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

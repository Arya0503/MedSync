"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SeverityBadge } from "./SeverityBadge";
import { IconFileText, IconCheckCircle, IconArrowRight } from "./icons";

interface DiscrepancyItem {
  id: string;
  patientId: string;
  patient: {
    name: string;
    mrn: string;
  };
  drugLabel: string;
  type: string;
  severity: any;
  detail: string;
  status: string;
  dueAt: string;
  isOverdue: boolean;
  hoursRemaining: number;
  entries: Array<{
    id: string;
    drugNameRaw: string;
    strengthRaw: string | null;
    formRaw: string | null;
    instructionRaw: string | null;
    documentId: string;
    visit: {
      facility: string;
      visitType: string;
      visitDate: string;
    };
  }>;
}

interface ReviewCardProps {
  item: DiscrepancyItem;
  canApprove: boolean;
  onActionComplete: () => void;
}

export function ReviewCard({ item, canApprove, onActionComplete }: ReviewCardProps) {
  const [selectedEntryId, setSelectedEntryId] = useState<string>(
    item.entries[item.entries.length - 1]?.id || ""
  );
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "APPROVED" | "REJECTED" | "ESCALATED") => {
    if (action === "APPROVED" && !selectedEntryId) {
      setError("Please choose one verified source entry before approving.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/discrepancies/${item.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: note.trim() || null,
          approvedEntryId: action === "APPROVED" ? selectedEntryId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onActionComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <article
      className={`surface-solid rounded-xl border p-5 sm:p-6 transition-shadow shadow-sm ${
        item.isOverdue
          ? "border-red-400 bg-red-50/20 dark:bg-red-950/20"
          : "border-line"
      }`}
      aria-labelledby={`discrepancy-${item.id}`}
    >
      {/* Header: Severity, Drug, Patient, SLA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <SeverityBadge severity={item.severity} />
          <div>
            <h3 id={`discrepancy-${item.id}`} className="font-serif text-xl font-bold text-ink">
              {item.drugLabel}
            </h3>
            <span className="font-mono text-xs text-ink-soft">
              Type: {item.type.replace(/_/g, " ")} • Patient:{" "}
              <Link
                href={`/clinic/patients/${item.patientId}`}
                className="font-semibold text-ink hover:underline"
              >
                {item.patient.name} ({item.patient.mrn})
              </Link>
            </span>
          </div>
        </div>

        {/* SLA Status in Words */}
        <div className="text-right">
          {item.isOverdue ? (
            <span className="font-mono text-xs font-bold text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300 px-2.5 py-1 rounded border border-red-300">
              OVERDUE ({Math.abs(item.hoursRemaining)}h past SLA)
            </span>
          ) : (
            <span className="font-mono text-xs font-medium text-ink-soft bg-surface px-2.5 py-1 rounded border border-line">
              Due in {item.hoursRemaining} hours
            </span>
          )}
        </div>
      </div>

      {/* Clinical Condition Detail */}
      <div className="my-4 p-3.5 rounded-lg bg-bg/70 border border-line">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-0.5">
          Discrepancy Detail
        </span>
        <p className="text-sm font-semibold text-ink leading-relaxed">
          {item.detail}
        </p>
      </div>

      {/* Side-by-Side Comparison of Source Values */}
      <div className="space-y-2 mb-6">
        <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
          Conflicting Source Values (Select verified entry for approval):
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {item.entries.map((entry) => {
            const isSelected = selectedEntryId === entry.id;

            return (
              <label
                key={entry.id}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-accent bg-soft/20 shadow-sm ring-1 ring-accent"
                    : "border-line bg-surface hover:bg-bg/60"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-ink">
                      {entry.visit.facility}
                    </span>
                    <input
                      type="radio"
                      name={`entry-${item.id}`}
                      value={entry.id}
                      checked={isSelected}
                      onChange={() => setSelectedEntryId(entry.id)}
                      className="text-accent focus:ring-focus"
                    />
                  </div>

                  <div className="font-mono text-xs font-bold text-accent">
                    {entry.strengthRaw || "—"} ({entry.formRaw || "Tablet"})
                  </div>

                  <div className="text-xs text-ink leading-snug">
                    Verbatim:{" "}
                    {entry.instructionRaw ? (
                      <span className="font-medium">"{entry.instructionRaw}"</span>
                    ) : (
                      <span className="italic text-ink-soft">Not recorded</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between text-[11px] text-ink-soft">
                  <span>{new Date(entry.visit.visitDate).toLocaleDateString()}</span>
                  <Link
                    href={`/clinic/documents/${entry.documentId}`}
                    className="font-semibold text-accent hover:underline flex items-center gap-0.5"
                  >
                    <IconFileText size={12} /> Source <IconArrowRight size={10} />
                  </Link>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Reviewer Note Input */}
      <div className="mb-4">
        <label htmlFor={`note-${item.id}`} className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
          Clinical Reconciliation Note (Optional)
        </label>
        <input
          id={`note-${item.id}`}
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Verified with patient; dosage was titrated during hospitalization."
          className="w-full px-3 py-2 rounded-lg border border-line bg-surface text-xs text-ink focus:ring-2 focus:ring-focus"
        />
      </div>

      {error && (
        <div className="mb-4 p-2.5 rounded bg-red-50 border border-red-300 text-red-900 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Review Actions Bar */}
      <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-ink-soft">
          {canApprove ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              ✓ Pharmacist authorization active: You may approve verified source values.
            </span>
          ) : (
            <span className="text-ink-soft italic">
              Clinician view: Discrepancy approvals are restricted to licensed pharmacists. You may Reject or Escalate.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAction("ESCALATED")}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg border border-line text-xs font-semibold text-ink hover:bg-soft/30 transition-colors disabled:opacity-50"
          >
            Escalate
          </button>
          <button
            type="button"
            onClick={() => handleAction("REJECTED")}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg border border-red-300 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 transition-colors disabled:opacity-50"
          >
            Reject (Needs Clarification)
          </button>
          {canApprove && (
            <button
              type="button"
              onClick={() => handleAction("APPROVED")}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <IconCheckCircle size={14} />
              {loading ? "Approving..." : "Approve Selected Source Value"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

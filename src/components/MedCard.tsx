import React from "react";
import Link from "next/link";
import { StatusBadge, MedicationStatusType } from "./StatusBadge";
import { IconFileText, IconArrowRight } from "./icons";

interface MedCardProps {
  drugName: string;
  strength: string;
  form: string;
  instructionRaw: string | null;
  statusText: MedicationStatusType;
  sourceFacility: string;
  sourceDate: string;
  documentId: string;
  lineId?: string;
  isVerified: boolean;
}

export function MedCard({
  drugName,
  strength,
  form,
  instructionRaw,
  statusText,
  sourceFacility,
  sourceDate,
  documentId,
  lineId,
  isVerified,
}: MedCardProps) {
  return (
    <article
      className="surface-solid surface-elevated rounded-xl p-5 sm:p-6 border border-line flex flex-col justify-between transition-shadow hover:shadow-md"
      aria-labelledby={`med-${drugName.replace(/\s+/g, "-")}`}
    >
      <div>
        {/* Top Header: Drug Name, Form, and Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3
              id={`med-${drugName.replace(/\s+/g, "-")}`}
              className="font-serif text-xl sm:text-2xl font-bold text-ink"
            >
              {drugName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm font-semibold text-accent px-2 py-0.5 rounded bg-soft/30">
                {strength}
              </span>
              <span className="text-xs text-ink-soft uppercase tracking-wider font-medium">
                {form}
              </span>
            </div>
          </div>
          <StatusBadge status={statusText} />
        </div>

        {/* Verbatim Instruction */}
        <div className="mt-4 p-3.5 rounded-lg bg-bg/80 border border-line/70">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1">
            Verbatim Prescription Instruction
          </span>
          <p className="text-sm font-medium text-ink leading-relaxed font-sans">
            {instructionRaw ? `"${instructionRaw}"` : <span className="italic text-ink-soft">No instruction recorded in latest note</span>}
          </p>
        </div>
      </div>

      {/* Footer: Source Traceability and View Source Link */}
      <div className="mt-5 pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-soft">
        <div>
          <span className="font-medium text-ink">{sourceFacility}</span> • <span>{sourceDate}</span>
        </div>
        <Link
          href={`/clinic/documents/${documentId}?lineId=${lineId || ""}`}
          className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline focus:ring-2 focus:ring-focus rounded p-1"
        >
          <IconFileText size={14} /> See Source Document <IconArrowRight size={12} />
        </Link>
      </div>
    </article>
  );
}

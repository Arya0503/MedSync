"use client";

import React, { useState } from "react";
import Link from "next/link";
import { IconSearch, IconFileText, IconArrowRight } from "./icons";

interface VisitColumn {
  id: string;
  facility: string;
  visitType: string;
  visitDate: string;
}

interface ComparisonCell {
  visitId: string;
  present: boolean;
  statusLabel: "Changed" | "New" | "Steady" | "Not listed";
  entry: {
    id: string;
    drugName: string;
    strength: string | null;
    form: string | null;
    instruction: string | null;
    documentId: string;
    documentLineId?: string | null;
    page: number;
    box: { x: number; y: number; w: number; h: number } | null;
  } | null;
  accessibleAriaName: string;
}

interface ComparisonRow {
  drugId: string | null;
  drugName: string;
  hasChanges: boolean;
  cells: ComparisonCell[];
}

interface ComparisonTableProps {
  visits: VisitColumn[];
  rows: ComparisonRow[];
}

export function ComparisonTable({ visits, rows }: ComparisonTableProps) {
  const [filterChangedOnly, setFilterChangedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRows = rows.filter((row) => {
    if (filterChangedOnly && !row.hasChanges) return false;
    if (searchTerm && !row.drugName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-soft">
            <IconSearch size={14} />
          </div>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by medicine..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-line rounded-lg text-ink focus:ring-2 focus:ring-focus"
            aria-label="Filter medications by name"
          />
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-ink font-semibold">
          <input
            type="checkbox"
            checked={filterChangedOnly}
            onChange={(e) => setFilterChangedOnly(e.target.checked)}
            className="rounded border-line text-accent focus:ring-focus w-4 h-4"
          />
          <span>Show only changed medications across visits</span>
        </label>
      </div>

      {/* Accessible Table */}
      <div className="surface-solid rounded-xl border border-line overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse" aria-label="Medication comparison matrix across visits">
            <caption className="sr-only">
              Cross-visit medication comparison matrix showing strength, instruction, and change status across clinical visits.
            </caption>
            <thead>
              <tr className="bg-bg/90 border-b border-line text-ink-soft">
                <th scope="col" className="py-3 px-4 font-bold uppercase tracking-wider text-ink sticky left-0 bg-surface/95 z-10 border-r border-line min-w-[180px]">
                  Medication
                </th>
                {visits.map((v, i) => (
                  <th scope="col" key={v.id} className="py-3 px-4 font-bold uppercase tracking-wider min-w-[220px]">
                    <div>Visit {i + 1}: {v.facility}</div>
                    <div className="font-mono text-[10px] text-ink-soft font-normal">{v.visitDate} ({v.visitType})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={visits.length + 1} className="py-8 text-center text-ink-soft italic">
                    No medications match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.drugName} className="hover:bg-bg/40 transition-colors">
                    {/* Sticky Medication Name Column */}
                    <th scope="row" className="py-3 px-4 font-serif font-bold text-sm text-ink sticky left-0 bg-surface/95 z-10 border-r border-line">
                      <div className="flex items-center justify-between gap-1">
                        <span>{row.drugName}</span>
                        {row.hasChanges && (
                          <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-200 px-1.5 py-0.5 rounded">
                            Changed
                          </span>
                        )}
                      </div>
                    </th>

                    {/* Cells for each visit */}
                    {row.cells.map((cell) => {
                      if (!cell.present || !cell.entry) {
                        return (
                          <td key={cell.visitId} className="py-3 px-4 text-ink-soft italic bg-bg/20">
                            <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-medium text-[11px]">
                              Not listed
                            </span>
                          </td>
                        );
                      }

                      const e = cell.entry;
                      return (
                        <td key={cell.visitId} className="py-3 px-4 align-top">
                          <div className="space-y-1.5">
                            {/* Status in words */}
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-bold text-xs text-accent">
                                {e.strength || "—"}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  cell.statusLabel === "Changed"
                                    ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200"
                                    : cell.statusLabel === "New"
                                    ? "bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950 dark:text-sky-200"
                                    : "bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-200"
                                }`}
                              >
                                {cell.statusLabel === "Changed" ? "Changed:" : cell.statusLabel === "New" ? "New:" : "Steady:"}
                              </span>
                            </div>

                            {/* Verbatim Instruction */}
                            <div className="text-[11px] text-ink leading-snug line-clamp-2">
                              {e.instruction ? `"${e.instruction}"` : <span className="italic text-ink-soft">No instruction recorded</span>}
                            </div>

                            {/* Open Source Button with Descriptive Accessible Name */}
                            <div className="pt-1">
                              <Link
                                href={`/clinic/documents/${e.documentId}?lineId=${e.documentLineId || ""}`}
                                aria-label={cell.accessibleAriaName}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                              >
                                <IconFileText size={12} /> Source <IconArrowRight size={10} />
                              </Link>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

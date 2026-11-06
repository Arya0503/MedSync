import React from "react";
import { IconCheckCircle, IconClock, IconAlertCircle } from "./icons";

export type MedicationStatusType = "Verified" | "Pending professional review" | "Needs clarification";

interface StatusBadgeProps {
  status: MedicationStatusType;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  if (status === "Verified") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700 ${className}`}
        role="status"
        aria-label="Status: Verified"
      >
        <IconCheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
        <span>Verified</span>
      </span>
    );
  }

  if (status === "Needs clarification") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-800 border border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-700 ${className}`}
        role="status"
        aria-label="Status: Needs clarification"
      >
        <IconAlertCircle size={14} className="text-red-600 dark:text-red-400" />
        <span>Needs clarification</span>
      </span>
    );
  }

  // Pending professional review
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 ${className}`}
      role="status"
      aria-label="Status: Pending professional review"
    >
      <IconClock size={14} className="text-amber-600 dark:text-amber-400" />
      <span>Pending professional review</span>
    </span>
  );
}

import React from "react";
import { Severity } from "@prisma/client";
import { IconOctagon, IconTriangle, IconCircle } from "./icons";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className = "" }: SeverityBadgeProps) {
  if (severity === Severity.HIGH) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-red-100 text-red-900 border-2 border-red-600 dark:bg-red-950/80 dark:text-red-100 dark:border-red-500 ${className}`}
        aria-label="Severity: High"
      >
        <IconOctagon size={14} className="text-red-700 dark:text-red-400 stroke-[2.5]" />
        <span>High</span>
      </span>
    );
  }

  if (severity === Severity.MEDIUM) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border-2 border-amber-600 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-500 ${className}`}
        aria-label="Severity: Medium"
      >
        <IconTriangle size={14} className="text-amber-700 dark:text-amber-400 stroke-[2.5]" />
        <span>Medium</span>
      </span>
    );
  }

  // LOW
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-900 border-2 border-sky-600 dark:bg-sky-950/80 dark:text-sky-100 dark:border-sky-500 ${className}`}
      aria-label="Severity: Low"
    >
      <IconCircle size={14} className="text-sky-700 dark:text-sky-400 stroke-[2.5]" />
      <span>Low</span>
    </span>
  );
}

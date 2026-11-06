import React from "react";
import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <div className="surface-elevated p-8 sm:p-10 rounded-xl surface-solid border border-line">
        <span className="font-mono text-xs uppercase tracking-widest text-ink-soft bg-soft/40 px-2.5 py-1 rounded">
          Record Not Located (404)
        </span>
        <h1 className="font-serif text-3xl font-bold text-ink mt-4 mb-3">
          We couldn’t find this page or document.
        </h1>
        <p className="text-sm text-ink-soft leading-relaxed mb-6">
          The requested clinical record, document, or path does not exist on this local server, or may have been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-ink font-medium text-sm hover:opacity-95 transition-opacity"
        >
          <IconArrowLeft size={16} /> Return to Home
        </Link>
      </div>
    </div>
  );
}

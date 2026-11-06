"use client";

import React, { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <div className="surface-elevated p-8 sm:p-10 rounded-xl surface-solid border border-line">
        <span className="font-mono text-xs uppercase tracking-widest text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300 px-2.5 py-1 rounded">
          Local Processing Notice
        </span>
        <h1 className="font-serif text-3xl font-bold text-ink mt-4 mb-3">
          We encountered an issue reading this record.
        </h1>
        <p className="text-sm text-ink-soft leading-relaxed mb-6">
          The operation could not be completed on this local server. Please verify the document format or try refreshing the request.
        </p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-lg bg-accent text-accent-ink font-medium text-sm hover:opacity-95 transition-opacity"
        >
          Retry action
        </button>
      </div>
    </div>
  );
}

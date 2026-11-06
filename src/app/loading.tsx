import React from "react";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-6" aria-busy="true" aria-label="Loading content">
      <div className="h-8 bg-line/60 rounded-md w-1/3" />
      <div className="h-4 bg-line/40 rounded w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="h-40 bg-surface border border-line rounded-lg" />
        <div className="h-40 bg-surface border border-line rounded-lg" />
        <div className="h-40 bg-surface border border-line rounded-lg" />
      </div>
      <div className="h-64 bg-surface border border-line rounded-lg" />
    </div>
  );
}

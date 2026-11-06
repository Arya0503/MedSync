"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ReviewCard } from "@/components/ReviewCard";
import { IconSearch, IconShield } from "@/components/icons";

export default function ReviewQueuePage() {
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("CLINICIAN");
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<string>("");
  const [status, setStatus] = useState<string>("PENDING");
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severity) params.set("severity", severity);
      if (status) params.set("status", status);
      if (overdueOnly) params.set("overdue", "true");
      if (searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/review-queue?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setDiscrepancies(data.discrepancies);
        setUserRole(data.userRole);
      }
    } catch (e) {
      console.error("Queue fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [severity, status, overdueOnly, searchQuery]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const canApprove = userRole === "PHARMACIST" || userRole === "ADMIN";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-soft/40 text-accent uppercase tracking-wider mb-2">
            <IconShield size={14} /> Clinical Review Queue
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink">
            Medication Reconciliation & Discrepancy Queue
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Resolve conflicting, missing, and outdated medication instructions across clinical visits.
          </p>
        </div>

        <div className="text-right">
          <span className="font-mono text-xs font-bold px-3 py-1.5 rounded bg-surface border border-line text-ink">
            {discrepancies.length} Item(s) in Queue
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface-solid rounded-xl p-4 border border-line space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Severity Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-ink-soft font-semibold mr-1">Severity:</span>
            {["", "HIGH", "MEDIUM", "LOW"].map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                  severity === s
                    ? "bg-accent text-accent-ink border-accent"
                    : "border-line text-ink hover:bg-soft/30 bg-surface"
                }`}
              >
                {s === "" ? "All Severities" : s}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-ink-soft font-semibold mr-1">Status:</span>
            {["PENDING", "ESCALATED", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatus(st)}
                className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                  status === st
                    ? "bg-accent text-accent-ink border-accent"
                    : "border-line text-ink hover:bg-soft/30 bg-surface"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-soft">
              <IconSearch size={14} />
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by drug name, detail, or MRN..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-line bg-surface text-ink text-xs focus:ring-2 focus:ring-focus"
            />
          </div>

          {/* Overdue Only Filter */}
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink select-none">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-line text-accent focus:ring-focus w-4 h-4"
            />
            <span>Show Overdue SLA Items Only</span>
          </label>
        </div>
      </div>

      {/* Discrepancies List */}
      <section aria-label="Discrepancy queue items" className="space-y-6">
        {loading ? (
          <div className="surface-solid rounded-xl p-12 text-center border border-line text-ink-soft">
            Loading queue items...
          </div>
        ) : discrepancies.length === 0 ? (
          <div className="surface-solid rounded-xl p-12 text-center border border-line">
            <p className="font-serif text-lg font-bold text-ink">Nothing to review.</p>
            <p className="text-xs text-ink-soft mt-1">
              When two clinical lists disagree, the conflict will appear here for reconciliation.
            </p>
          </div>
        ) : (
          discrepancies.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              canApprove={canApprove}
              onActionComplete={fetchQueue}
            />
          ))
        )}
      </section>
    </div>
  );
}

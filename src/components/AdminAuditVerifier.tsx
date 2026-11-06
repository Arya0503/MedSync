"use client";

import React, { useState } from "react";
import { IconShield, IconCheckCircle } from "./icons";

export function AdminAuditVerifier({ totalLogs }: { totalLogs: number }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/audit/verify", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (err: any) {
      setResult({ valid: false, error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="surface-solid rounded-xl p-6 border border-line surface-elevated space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <IconShield size={20} className="text-accent" />
            <h2 className="font-serif text-xl font-bold text-ink">
              Cryptographic Audit Chain Integrity Verification
            </h2>
          </div>
          <p className="text-xs text-ink-soft mt-1">
            Recomputes SHA-256 hash chaining across every sequential row from genesis. Detects any unauthorized modification or deletion.
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={verifying}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-ink font-semibold text-xs hover:opacity-95 transition-opacity disabled:opacity-50 shrink-0 shadow-sm"
        >
          {verifying ? "Verifying Hash Chain..." : "Verify Audit Chain Integrity"}
        </button>
      </div>

      {result && (
        <div
          role="region"
          aria-live="polite"
          className={`p-4 rounded-lg border text-xs space-y-1.5 ${
            result.valid
              ? "bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-red-50 border-red-300 text-red-950 dark:bg-red-950/60 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {result.valid ? (
              <>
                <IconCheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span>Audit Chain Integrity Verified: Zero Tampering Detected</span>
              </>
            ) : (
              <span>⚠️ Chain Integrity Failure: Data Modification Detected!</span>
            )}
          </div>
          <p>
            {result.valid
              ? `Successfully walked and recomputed SHA-256 hashes across all ${result.totalVerified} sequential audit logs. Every prevHash matches preceding row hash.`
              : `Integrity broken at row seq #${result.brokenSeq}: ${result.error}`}
          </p>
        </div>
      )}
    </div>
  );
}

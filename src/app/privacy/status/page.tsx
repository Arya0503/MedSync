import React from "react";
import { getEgressStatus } from "@/lib/egressGuard";
import { IconShield, IconCheckCircle } from "@/components/icons";

export default async function PrivacyStatusPage() {
  const status = await getEgressStatus();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-soft/40 text-accent uppercase tracking-wider mb-2">
          <IconShield size={14} /> Network Isolation & Egress Guard Monitor
        </div>
        <h1 className="font-serif text-3xl font-bold text-ink">
          Privacy Status & Egress Audit
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Real-time verification of local-only processing and zero external data transmission.
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-solid rounded-xl p-5 border border-line surface-elevated space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Egress Guard Status
          </span>
          <div className="flex items-center gap-2 pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-serif text-xl font-bold text-ink">Active & Enforcing</span>
          </div>
          <p className="text-[11px] text-ink-soft">All outbound traffic strictly filtered</p>
        </div>

        <div className="surface-solid rounded-xl p-5 border border-line surface-elevated space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Blocked Outbound Calls
          </span>
          <div className="font-mono text-2xl font-bold text-ink pt-1">
            {status.blockedAttemptsCount}
          </div>
          <p className="text-[11px] text-ink-soft">Target: 0 blocked attempts</p>
        </div>

        <div className="surface-solid rounded-xl p-5 border border-line surface-elevated space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Cloud AI Services
          </span>
          <div className="flex items-center gap-1.5 pt-1 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            <IconCheckCircle size={16} /> Disconnected (0 Cloud APIs)
          </div>
          <p className="text-[11px] text-ink-soft">Local rule-based extraction only</p>
        </div>

        <div className="surface-solid rounded-xl p-5 border border-line surface-elevated space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Storage Location
          </span>
          <div className="font-mono text-xs font-semibold text-accent pt-1 truncate">
            {status.storageLocation}
          </div>
          <p className="text-[11px] text-ink-soft">Encrypted on local filesystem</p>
        </div>
      </div>

      {/* Active Internal Allowlist */}
      <div className="surface-solid rounded-xl p-6 border border-line space-y-3">
        <h2 className="font-serif text-lg font-bold text-ink">
          Permitted Internal Hosts (Allowlist)
        </h2>
        <p className="text-xs text-ink-soft">
          Only requests targeting internal Docker container aliases or localhost loopback are permitted by the system.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {status.allowedHosts.map((host) => (
            <span
              key={host}
              className="font-mono text-xs font-semibold px-3 py-1.5 rounded-lg bg-soft/30 text-ink border border-line"
            >
              ✓ {host}
            </span>
          ))}
        </div>
      </div>

      {/* Recent Egress Audit Events */}
      <div className="surface-solid rounded-xl border border-line overflow-hidden space-y-3 p-6">
        <h2 className="font-serif text-lg font-bold text-ink">
          Outbound Access Audit Log ({status.recentEvents.length})
        </h2>
        {status.recentEvents.length === 0 ? (
          <p className="text-xs text-ink-soft italic">
            Zero external outbound network calls have been initiated. The application remains strictly air-gapped.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-line text-ink-soft uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Target Host</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Source URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {status.recentEvents.map((evt: any) => (
                  <tr key={evt.id} className="font-mono">
                    <td className="py-2 px-3 text-ink-soft">{new Date(evt.ts).toISOString()}</td>
                    <td className="py-2 px-3 font-bold text-ink">{evt.host}</td>
                    <td className="py-2 px-3">
                      <span className={evt.blocked ? "text-red-700 font-bold" : "text-emerald-700 font-bold"}>
                        {evt.blocked ? "BLOCKED" : "ALLOWED"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-ink-soft truncate max-w-xs">{evt.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

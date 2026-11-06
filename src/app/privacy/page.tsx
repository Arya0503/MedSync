import React from "react";
import Link from "next/link";
import { IconShield, IconCheckCircle, IconArrowRight } from "@/components/icons";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-soft/40 text-accent uppercase tracking-wider mb-2">
          <IconShield size={14} /> Constraint 7: Privacy & Sovereign Data Guarantee
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Privacy & Local-Only Data Policy
        </h1>
        <p className="text-sm text-ink-soft mt-1 leading-relaxed">
          MedBridge is engineered from the ground up to ensure that sensitive health records never leave this server.
        </p>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="surface-solid rounded-xl p-6 border border-line space-y-3">
          <div className="flex items-center gap-2 text-accent font-serif font-bold text-lg">
            <IconCheckCircle size={20} /> 1. Zero Cloud AI or External APIs
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">
            No personal or sensitive records are ever transmitted to external cloud-hosted AI providers (such as OpenAI, Anthropic, Google, Azure).
            Document OCR, line analysis, and structuring are performed exclusively on-premise using local algorithms and local Docker services.
          </p>
        </div>

        <div className="surface-solid rounded-xl p-6 border border-line space-y-3">
          <div className="flex items-center gap-2 text-accent font-serif font-bold text-lg">
            <IconCheckCircle size={20} /> 2. Complete Asset Self-Hosting
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">
            Every font, stylesheet, script, and image is bundled and served directly from this local origin.
            We do not use Google Fonts, third-party CDNs, hosted analytics, external trackers, or cloud authentication platforms.
          </p>
        </div>

        <div className="surface-solid rounded-xl p-6 border border-line space-y-3">
          <div className="flex items-center gap-2 text-accent font-serif font-bold text-lg">
            <IconCheckCircle size={20} /> 3. Multi-Layered Egress Guard
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">
            All server-side network communications pass through an enforced Egress Guard (<code className="font-mono text-accent">safeFetch</code>)
            that blocks any outbound request not targeting pre-approved internal network hosts (<code className="font-mono text-xs">localhost, db, ollama</code>).
            Every blocked request triggers a tamper-evident audit event.
          </p>
        </div>

        <div className="surface-solid rounded-xl p-6 border border-line space-y-3">
          <div className="flex items-center gap-2 text-accent font-serif font-bold text-lg">
            <IconCheckCircle size={20} /> 4. Tamper-Evident Hash-Chained Audit
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">
            Every view, upload, correction, and discrepancy resolution is appended to an immutable SHA-256 hash-chained log.
            Database-level triggers block record modifications, and the chain integrity can be mathematically verified at any time.
          </p>
        </div>
      </div>

      {/* Live Status CTA */}
      <div className="p-6 rounded-xl gradient-hakkagoori dark:gradient-untitled border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-bold text-ink">
            Inspect Live Egress Guard Status
          </h2>
          <p className="text-xs text-ink-soft mt-0.5">
            Verify real-time outbound call blocking and examine the active allowlist.
          </p>
        </div>
        <Link
          href="/privacy/status"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface text-ink border border-line font-semibold text-xs hover:bg-soft/20 transition-colors shrink-0 shadow-sm"
        >
          Open Live Egress Status <IconArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

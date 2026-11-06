import React from "react";
import { notFound } from "next/navigation";
import { getHandoverCardByToken, generateQrCodeDataUrl } from "@/lib/handover";
import { StatusBadge } from "@/components/StatusBadge";
import { IconShield, IconCheckCircle, IconFileText } from "@/components/icons";
import { PERSISTENT_SAFETY_NOTICE } from "@/lib/safety";

export default async function PublicHandoverPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  const data = await getHandoverCardByToken(token);

  if (!data || !data.card || !data.patient || !data.items) {
    notFound();
  }

  if (data.revoked) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="surface-solid surface-elevated p-8 rounded-xl border border-line">
          <span className="font-mono text-xs uppercase tracking-widest text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-200 px-2 py-0.5 rounded">
            Handover Card Revoked
          </span>
          <h1 className="font-serif text-2xl font-bold text-ink mt-4 mb-2">
            This handover card has been revoked.
          </h1>
          <p className="text-xs text-ink-soft">
            The patient or prescribing clinician has invalidated this link. Please obtain an updated handover card.
          </p>
        </div>
      </div>
    );
  }

  if (data.expired) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="surface-solid surface-elevated p-8 rounded-xl border border-line">
          <span className="font-mono text-xs uppercase tracking-widest text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-200 px-2 py-0.5 rounded">
            Handover Card Expired
          </span>
          <h1 className="font-serif text-2xl font-bold text-ink mt-4 mb-2">
            This handover card has expired.
          </h1>
          <p className="text-xs text-ink-soft">
            Handover cards expire after a maximum validity period to ensure instructions reflect current clinical state.
          </p>
        </div>
      </div>
    );
  }

  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const shareUrl = `${baseUrl}/h/${token}`;
  const qrDataUrl = await generateQrCodeDataUrl(shareUrl);

  const verifiedItems = data.items.filter((item) => item.isVerified);
  const pendingItems = data.items.filter((item) => !item.isVerified);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Handover Header */}
      <div className="gradient-hakkagoori dark:gradient-untitled rounded-2xl p-6 sm:p-8 border border-line surface-solid shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-surface border border-line text-accent mb-2">
              <IconShield size={14} /> Verified Clinical Handover Record
            </div>
            <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">
              {data.patient.name}
            </h1>
            <p className="text-xs text-ink-soft mt-1">
              MRN: {data.patient.mrn} • DOB: {data.patient.dob} • Valid until: {new Date(data.card.expiresAt).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-white p-2 rounded-xl border border-line shrink-0 shadow-sm flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Handover Verification QR Code" className="w-24 h-24" />
            <span className="text-[10px] font-mono text-gray-500 mt-1">Scan for Handover</span>
          </div>
        </div>
      </div>

      {/* Verified Medicines Section */}
      <section aria-labelledby="verified-meds-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="verified-meds-heading" className="font-serif text-2xl font-bold text-ink flex items-center gap-2">
            <IconCheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
            Verified Medications ({verifiedItems.length})
          </h2>
          <span className="text-xs font-mono text-ink-soft">
            Reconciled across clinical visits
          </span>
        </div>

        {verifiedItems.length === 0 ? (
          <div className="surface-solid rounded-xl p-8 text-center border border-line text-xs text-ink-soft">
            No medications currently carry verified pharmacist approval.
          </div>
        ) : (
          <div className="space-y-3">
            {verifiedItems.map((med) => (
              <div
                key={med.drugName}
                className="surface-solid rounded-xl p-4 sm:p-5 border border-line surface-elevated space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink">
                      {med.drugName}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs font-semibold text-accent">
                        {med.strength}
                      </span>
                      <span className="text-[11px] text-ink-soft uppercase font-medium">
                        • {med.form}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status="Verified" />
                </div>

                <div className="p-3 rounded-lg bg-bg/80 border border-line text-xs font-medium text-ink">
                  <span className="block text-[10px] font-bold uppercase text-ink-soft mb-0.5">
                    Verbatim Instruction
                  </span>
                  "{med.instruction}"
                </div>

                <div className="text-[11px] text-ink-soft pt-1">
                  Source: {med.facility} ({med.lastUpdated})
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Unresolved / Pending Items Section */}
      {pendingItems.length > 0 && (
        <section aria-labelledby="pending-meds-heading" className="space-y-3 pt-4 border-t border-line">
          <h2 id="pending-meds-heading" className="font-serif text-xl font-bold text-ink text-amber-900 dark:text-amber-200">
            Unresolved / Pending Professional Review ({pendingItems.length})
          </h2>
          <p className="text-xs text-ink-soft">
            These medicines have conflicting or unconfirmed instructions across visits and require clinician reconciliation before clinical reliance.
          </p>

          <div className="space-y-2">
            {pendingItems.map((med) => (
              <div
                key={med.drugName}
                className="p-3.5 rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-ink text-sm">{med.drugName}</span>
                  <span className="font-mono text-xs text-ink-soft ml-2">({med.strength})</span>
                  <div className="text-[11px] text-ink-soft mt-0.5">
                    Instruction: {med.instruction}
                  </div>
                </div>
                <StatusBadge status={med.status as any} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Handover Safety Footer */}
      <div className="p-4 rounded-xl bg-surface border border-line surface-solid text-xs text-ink-soft text-center space-y-1">
        <p className="font-semibold text-ink">{PERSISTENT_SAFETY_NOTICE}</p>
        <p className="text-[11px]">
          Handover cards are generated on-premise. Card views: {data.card.viewCount}.
        </p>
      </div>
    </div>
  );
}

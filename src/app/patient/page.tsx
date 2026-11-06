import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getMedicationPatientStatus } from "@/lib/discrepancy/engine";
import { MedCard } from "@/components/MedCard";
import { IconShare, IconFileText, IconShield } from "@/components/icons";
import { PatientShareCard } from "@/components/PatientShareCard";
import { PatientReminders } from "@/components/PatientReminders";

export default async function PatientPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  let patientId = session.patientId;
  if (!patientId) {
    if (session.role === "ADMIN" || session.role === "CLINICIAN" || session.role === "PHARMACIST") {
      const firstPatient = await db.patient.findFirst({ orderBy: { createdAt: "asc" } });
      patientId = firstPatient?.id || null;
    }
  }

  if (!patientId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">No patient record linked</h1>
      </div>
    );
  }

  await assertPatientAccess(session, patientId);

  const patient = await db.patient.findUnique({
    where: { id: patientId },
    include: {
      visits: {
        orderBy: { visitDate: "asc" },
        include: {
          documents: true,
          entries: {
            where: { confirmed: true },
            include: { drug: true, document: true, fields: true },
          },
        },
      },
      cards: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!patient) redirect("/login");

  // Gather unique medications from confirmed entries
  const allEntries = patient.visits.flatMap((v) => v.entries);
  const drugMap = new Map<string, typeof allEntries[0][]>();

  for (const entry of allEntries) {
    const key = entry.drugId ?? entry.drugNameRaw.toLowerCase().trim();
    if (!drugMap.has(key)) drugMap.set(key, []);
    drugMap.get(key)!.push(entry);
  }

  const medCardsData = [];

  for (const [, entries] of drugMap.entries()) {
    entries.sort((a: any, b: any) => a.visitId.localeCompare(b.visitId));
    const latest = entries[entries.length - 1];
    const drugLabel = latest.drug?.canonicalName ?? latest.drugNameRaw;
    const status = await getMedicationPatientStatus(patient.id, latest.drugId, drugLabel);

    let instructionToDisplay = latest.instructionRaw;
    if (status.statusText === "Verified" && status.approvedEntryId) {
      const approved = entries.find((e: any) => e.id === status.approvedEntryId);
      if (approved?.instructionRaw) instructionToDisplay = approved.instructionRaw;
    }

    const primaryField = latest.fields[0];

    medCardsData.push({
      drugName: drugLabel,
      strength: latest.strengthRaw || "—",
      form: latest.formRaw || "Tablet",
      instructionRaw: instructionToDisplay,
      statusText: status.statusText,
      sourceFacility: patient.visits.find((v) => v.id === latest.visitId)?.facility || "Clinic",
      sourceDate: patient.visits.find((v) => v.id === latest.visitId)?.visitDate.toISOString().split("T")[0] || "",
      documentId: latest.documentId,
      lineId: primaryField?.lineId || undefined,
      isVerified: status.statusText === "Verified",
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Patient Greeting & Header Band */}
      <section className="gradient-hakkagoori dark:gradient-untitled rounded-2xl p-6 sm:p-8 border border-line surface-solid shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-surface/80 border border-line text-accent mb-2">
              <IconShield size={14} /> Record No: {patient.mrn} (Synthetic)
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
              {patient.name}’s Medications
            </h1>
            <p className="text-sm text-ink-soft mt-1">
              DOB: {patient.dob.toISOString().split("T")[0]} • Source-verified instructions across {patient.visits.length} clinical visits
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/api/patients/${patient.id}/summary.pdf`}
              download="medbridge-handover-summary.pdf"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-line text-ink font-semibold text-xs hover:bg-soft/30 transition-colors shadow-sm"
            >
              <IconFileText size={16} /> Download Handover Summary PDF
            </a>
            <a
              href="#share"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-ink font-semibold text-xs hover:opacity-95 transition-opacity shadow-sm"
            >
              <IconShare size={16} /> Share Handover Card
            </a>
          </div>
        </div>
      </section>

      {/* Medication Cards Section */}
      <section aria-labelledby="medications-heading">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id="medications-heading" className="font-serif text-2xl font-bold text-ink">
              Current Medication Regimen
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Every instruction is reproduced verbatim from source discharge notes and outpatient prescriptions.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-ink-soft bg-surface px-3 py-1 rounded border border-line">
            {medCardsData.length} Medicines Recorded
          </span>
        </div>

        {medCardsData.length === 0 ? (
          <div className="surface-solid rounded-xl p-12 text-center border border-line">
            <p className="text-ink font-medium">No verified medication records available yet.</p>
            <p className="text-xs text-ink-soft mt-1">
              Upload a prescription or clinical visit note to begin source-linked extraction.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {medCardsData.map((med) => (
              <MedCard key={med.drugName} {...med} />
            ))}
          </div>
        )}
      </section>

      {/* Share Handover Card Section */}
      <section id="share" className="pt-4 border-t border-line" aria-labelledby="share-heading">
        <h2 id="share-heading" className="font-serif text-2xl font-bold text-ink mb-2">
          Secure Handover Card
        </h2>
        <p className="text-xs text-ink-soft mb-6">
          Create a temporary, revocable link with a local QR code showing only verified medicines for pharmacy or hospital handover.
        </p>
        <PatientShareCard patientId={patient.id} existingCards={patient.cards} />
      </section>

      {/* Verified-Only Reminders Section (F17) */}
      <section className="pt-4 border-t border-line" aria-labelledby="reminders-heading">
        <h2 id="reminders-heading" className="font-serif text-2xl font-bold text-ink mb-2">
          Verified-Only Reminders
        </h2>
        <p className="text-xs text-ink-soft mb-6">
          Set personal reminder times. Reminders quote only verbatim, verified instructions. No audio-only alarms or calculated doses.
        </p>
        <PatientReminders
          verifiedMeds={medCardsData.filter((m) => m.isVerified).map((m) => ({
            name: m.drugName,
            strength: m.strength,
            instruction: m.instructionRaw || "As directed",
          }))}
        />
      </section>
    </div>
  );
}

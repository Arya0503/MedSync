import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ClinicUploadDocumentModal } from "@/components/ClinicUploadDocumentModal";
import { PatientShareCard } from "@/components/PatientShareCard";
import { IconFileText, IconArrowRight, IconShield, IconUsers } from "@/components/icons";

export default async function PatientWorkspacePage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const patientId = params.id;
  await assertPatientAccess(session, patientId);

  const patient = await db.patient.findUnique({
    where: { id: patientId },
    include: {
      visits: {
        orderBy: { visitDate: "asc" },
        include: {
          documents: {
            orderBy: { createdAt: "desc" },
            include: { entries: true },
          },
          entries: {
            where: { confirmed: true },
            include: { drug: true, document: true, fields: true },
          },
        },
      },
      discrepancies: {
        where: { status: { in: ["PENDING", "ESCALATED"] } },
        orderBy: { detectedAt: "desc" },
      },
      cards: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!patient) redirect("/clinic");

  // Build comparison rows
  const visits = patient.visits;
  const drugMap = new Map<string, {
    drugId: string | null;
    drugName: string;
    entries: typeof visits[0]["entries"];
  }>();

  for (const v of visits) {
    for (const entry of v.entries) {
      const key = entry.drugId ?? entry.drugNameRaw.toLowerCase().trim();
      if (!drugMap.has(key)) {
        drugMap.set(key, {
          drugId: entry.drugId,
          drugName: entry.drug?.canonicalName ?? entry.drugNameRaw,
          entries: [],
        });
      }
      drugMap.get(key)!.entries.push(entry);
    }
  }

  const comparisonRows = [];
  for (const [, group] of drugMap.entries()) {
    let firstSeenIdx = -1;
    let hasChanges = false;
    let prevEntry: typeof visits[0]["entries"][0] | null = null;

    const cells = visits.map((visit, vIdx) => {
      const entry = group.entries.find((e: any) => e.visitId === visit.id);
      if (!entry) {
        return {
          visitId: visit.id,
          present: false,
          statusLabel: "Not listed" as const,
          entry: null,
          accessibleAriaName: `${group.drugName}, ${visit.facility}, Not listed in this record.`,
        };
      }

      if (firstSeenIdx === -1) firstSeenIdx = vIdx;

      let statusLabel: "New" | "Changed" | "Steady" = "Steady";
      if (vIdx === firstSeenIdx && vIdx > 0) {
        statusLabel = "New";
        hasChanges = true;
      } else if (prevEntry) {
        const strDiff = (entry.strengthRaw || "").trim().toLowerCase() !== (prevEntry.strengthRaw || "").trim().toLowerCase();
        const instDiff = (entry.instructionRaw || "").trim().toLowerCase() !== (prevEntry.instructionRaw || "").trim().toLowerCase();
        if (strDiff || instDiff) {
          statusLabel = "Changed";
          hasChanges = true;
        }
      }

      prevEntry = entry;
      const primaryField = entry.fields[0];

      return {
        visitId: visit.id,
        present: true,
        statusLabel,
        entry: {
          id: entry.id,
          drugName: entry.drugNameRaw,
          strength: entry.strengthRaw,
          form: entry.formRaw,
          instruction: entry.instructionRaw,
          documentId: entry.documentId,
          documentLineId: primaryField?.lineId,
          page: primaryField?.page ?? 1,
          box: primaryField ? { x: primaryField.x, y: primaryField.y, w: primaryField.w, h: primaryField.h } : null,
        },
        accessibleAriaName: `${group.drugName}, ${visit.facility}, ${entry.strengthRaw || ""}, ${
          entry.instructionRaw || "no instruction"
        }, ${statusLabel}. Open source.`,
      };
    });

    comparisonRows.push({
      drugId: group.drugId,
      drugName: group.drugName,
      hasChanges,
      cells,
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Patient Header Banner */}
      <section className="gradient-hakkagoori dark:gradient-untitled rounded-2xl p-6 sm:p-8 border border-line surface-solid shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-surface border border-line text-accent">
                MRN: {patient.mrn}
              </span>
              {patient.discrepancies.length > 0 && (
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-red-100 text-red-900 border border-red-300 dark:bg-red-950 dark:text-red-200">
                  {patient.discrepancies.length} Discrepancy Pending Review
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">
              {patient.name}
            </h1>
            <p className="text-sm text-ink-soft mt-1">
              DOB: {patient.dob.toISOString().split("T")[0]} • {patient.visits.length} Visits recorded across clinical facilities
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <ClinicUploadDocumentModal
              patientId={patient.id}
              visits={patient.visits.map((v) => ({
                id: v.id,
                facility: v.facility,
                visitDate: v.visitDate.toISOString().split("T")[0],
              }))}
            />
            <a
              href={`/api/patients/${patient.id}/summary.pdf`}
              download={`medbridge-handover-${patient.mrn}.pdf`}
              className="px-4 py-2 rounded-lg bg-surface border border-line text-ink font-semibold text-xs hover:bg-soft/30 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <IconFileText size={14} /> Download PDF Summary
            </a>
          </div>
        </div>
      </section>

      {/* Cross-Visit Comparison Matrix Section */}
      <section id="comparison" aria-labelledby="comparison-heading" className="space-y-3">
        <div>
          <h2 id="comparison-heading" className="font-serif text-2xl font-bold text-ink">
            Cross-Visit Medication Reconciliation Matrix
          </h2>
          <p className="text-xs text-ink-soft">
            Every cell displays verbatim instructions from the confirmed clinical record and opens the exact source document.
          </p>
        </div>

        <ComparisonTable
          visits={visits.map((v) => ({
            id: v.id,
            facility: v.facility,
            visitType: v.visitType,
            visitDate: v.visitDate.toISOString().split("T")[0],
          }))}
          rows={comparisonRows}
        />
      </section>

      {/* Visits & Documents List */}
      <section aria-labelledby="visits-heading" className="space-y-4 pt-4 border-t border-line">
        <h2 id="visits-heading" className="font-serif text-2xl font-bold text-ink">
          Visit Timeline & Source Documents
        </h2>

        <div className="space-y-4">
          {patient.visits.map((visit, i) => (
            <div key={visit.id} className="surface-solid rounded-xl p-5 border border-line space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div>
                  <span className="font-mono text-xs text-accent font-bold uppercase tracking-wider">
                    Visit {i + 1}
                  </span>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    {visit.facility} — {visit.visitType}
                  </h3>
                </div>
                <span className="font-mono text-xs text-ink-soft">
                  {visit.visitDate.toISOString().split("T")[0]}
                </span>
              </div>

              {/* Documents in this visit */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
                  Attached Documents ({visit.documents.length})
                </h4>
                {visit.documents.length === 0 ? (
                  <p className="text-xs text-ink-soft italic">No documents attached to this visit.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visit.documents.map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/clinic/documents/${doc.id}`}
                        className="p-3 bg-bg/60 border border-line rounded-lg hover:border-accent hover:bg-surface transition-colors text-xs flex flex-col justify-between"
                      >
                        <div className="font-semibold text-ink flex items-center gap-1.5 truncate">
                          <IconFileText size={14} className="text-accent shrink-0" />
                          <span className="truncate">{doc.fileName}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-ink-soft">
                          <span>Status: <strong className="text-ink">{doc.status}</strong></span>
                          <span className="text-accent font-semibold flex items-center gap-0.5">
                            Source Viewer <IconArrowRight size={10} />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Handover Cards Section */}
      <section className="pt-4 border-t border-line">
        <h2 className="font-serif text-2xl font-bold text-ink mb-2">
          Handover Cards for {patient.name}
        </h2>
        <PatientShareCard patientId={patient.id} existingCards={patient.cards} />
      </section>
    </div>
  );
}

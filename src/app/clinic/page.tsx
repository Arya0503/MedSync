import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { IconUsers, IconArrowRight, IconShield, IconFileText } from "@/components/icons";
import { ClinicCreatePatientModal } from "@/components/ClinicCreatePatientModal";

export default async function ClinicDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    assertRole(session, [Role.CLINICIAN, Role.PHARMACIST, Role.ADMIN]);
  } catch (e) {
    redirect("/patient");
  }

  // Fetch patients granted to this professional
  let patients: any[] = [];

  if (session.role === Role.ADMIN) {
    patients = await db.patient.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        visits: { orderBy: { visitDate: "desc" }, take: 1 },
        discrepancies: { where: { status: "PENDING" } },
      },
    });
  } else {
    const grants = await db.accessGrant.findMany({
      where: { userId: session.id, revokedAt: null },
      include: {
        patient: {
          include: {
            visits: { orderBy: { visitDate: "desc" }, take: 1 },
            discrepancies: { where: { status: "PENDING" } },
          },
        },
      },
    });
    patients = grants.map((g) => g.patient);
  }

  // Fetch documents waiting for confirmation
  const pendingDocs = await db.sourceDocument.findMany({
    where: {
      status: { in: ["NEEDS_REVIEW", "UPLOADED", "PROCESSING"] },
      visit: {
        patientId: { in: patients.map((p) => p.id) },
      },
    },
    include: {
      visit: { include: { patient: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div>
          <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-soft/40 text-accent uppercase tracking-wider">
            Clinical Workspace
          </span>
          <h1 className="font-serif text-3xl font-bold text-ink mt-1">
            Patient Reconciliation Panel
          </h1>
          <p className="text-sm text-ink-soft mt-0.5">
            Signed in as {session.name} ({session.role}) • Access governed by patient grants
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/review"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-line text-xs font-semibold text-ink hover:bg-soft/20 shadow-sm transition-colors"
          >
            <IconShield size={14} /> View Discrepancy Queue
          </Link>
          <ClinicCreatePatientModal />
        </div>
      </div>

      {/* Documents Pending Confirmation Alert */}
      {pendingDocs.length > 0 && (
        <section className="p-5 rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/40 dark:border-amber-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <IconFileText size={16} /> {pendingDocs.length} Document(s) Awaiting Human Confirmation
            </h2>
            <span className="text-xs text-amber-800 dark:text-amber-300">
              Extraction confidence &lt; 0.80 requires verification before reconciliation
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/clinic/documents/${doc.id}`}
                className="p-3 bg-surface rounded-lg border border-line hover:border-accent transition-colors block text-xs"
              >
                <div className="font-semibold text-ink truncate">{doc.fileName}</div>
                <div className="text-ink-soft mt-1">
                  Patient: <span className="text-ink font-medium">{doc.visit.patient.name}</span> ({doc.visit.facility})
                </div>
                <div className="mt-2 text-accent font-semibold flex items-center gap-1">
                  Open Source Extraction <IconArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Patients List */}
      <section aria-labelledby="patients-list-heading">
        <h2 id="patients-list-heading" className="font-serif text-2xl font-bold text-ink mb-4">
          Authorized Patient Records ({patients.length})
        </h2>

        {patients.length === 0 ? (
          <div className="surface-solid rounded-xl p-12 text-center border border-line">
            <p className="font-medium text-ink">No authorized patient records found.</p>
            <p className="text-xs text-ink-soft mt-1">
              Create a synthetic patient or have a patient grant your user account access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((pat) => {
              const pendingCount = pat.discrepancies?.length ?? 0;
              const latestVisit = pat.visits?.[0];

              return (
                <article
                  key={pat.id}
                  className="surface-solid rounded-xl p-6 border border-line surface-elevated flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-serif text-xl font-bold text-ink">{pat.name}</h3>
                        <span className="font-mono text-xs text-ink-soft">MRN: {pat.mrn}</span>
                      </div>
                      {pendingCount > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-900 border border-red-300 dark:bg-red-950 dark:text-red-200">
                          {pendingCount} Discrepancy
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200">
                          Reconciled
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-line text-xs text-ink-soft space-y-1">
                      <div>DOB: {new Date(pat.dob).toISOString().split("T")[0]}</div>
                      <div>
                        Latest Visit: {latestVisit ? `${latestVisit.facility} (${new Date(latestVisit.visitDate).toISOString().split("T")[0]})` : "No visits recorded"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-line flex items-center justify-between">
                    <Link
                      href={`/clinic/patients/${pat.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                    >
                      Open Patient Workspace <IconArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

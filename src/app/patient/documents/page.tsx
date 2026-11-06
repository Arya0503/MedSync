import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";
import { IconFileText, IconArrowRight, IconShield } from "@/components/icons";

export default async function PatientDocumentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  let patientId = session.patientId;
  if (!patientId && session.role !== "PATIENT") {
    const first = await db.patient.findFirst({ orderBy: { createdAt: "asc" } });
    patientId = first?.id || null;
  }

  if (!patientId) redirect("/login");
  await assertPatientAccess(session, patientId);

  const patient = await db.patient.findUnique({
    where: { id: patientId },
    include: {
      visits: {
        orderBy: { visitDate: "desc" },
        include: {
          documents: {
            orderBy: { createdAt: "desc" },
            include: { entries: true },
          },
        },
      },
    },
  });

  if (!patient) redirect("/login");

  const documents = patient.visits.flatMap((v) =>
    v.documents.map((doc) => ({
      ...doc,
      facility: v.facility,
      visitType: v.visitType,
      visitDate: v.visitDate.toISOString().split("T")[0],
    }))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-surface border border-line text-accent mb-2">
          <IconShield size={14} /> MRN: {patient.mrn}
        </div>
        <h1 className="font-serif text-3xl font-bold text-ink">
          Uploaded Clinical Documents & Status
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Every prescription, discharge summary, or clinic note uploaded into this local server.
        </p>
      </div>

      <div className="surface-solid rounded-xl border border-line overflow-hidden">
        {documents.length === 0 ? (
          <div className="p-12 text-center text-ink-soft">
            <p className="font-medium text-ink">No documents uploaded yet.</p>
            <p className="text-xs mt-1">Uploaded files will appear here along with their local extraction status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-ink">
              <thead className="bg-bg/80 border-b border-line text-ink-soft uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Facility & Visit</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">SHA-256 Hash</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Source View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-bg/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-ink flex items-center gap-2">
                      <IconFileText size={16} className="text-accent shrink-0" />
                      <span>{doc.fileName}</span>
                    </td>
                    <td className="py-3 px-4 text-ink-soft">
                      {doc.facility} ({doc.visitType})
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-soft">{doc.visitDate}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-ink-soft">
                      {doc.sha256.substring(0, 12)}...
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                          doc.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                            : doc.status === "NEEDS_REVIEW"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                            : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                        }`}
                      >
                        {doc.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/clinic/documents/${doc.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                      >
                        Open Source <IconArrowRight size={12} />
                      </Link>
                    </td>
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

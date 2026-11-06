import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";
import { SourceViewer } from "@/components/SourceViewer";

export default async function DocumentSourcePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { lineId?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const docId = params.id;
  const initialLineId = searchParams.lineId;

  const doc = await db.sourceDocument.findUnique({
    where: { id: docId },
    include: {
      visit: { include: { patient: true } },
      lines: { orderBy: [{ page: "asc" }, { lineIndex: "asc" }] },
      entries: {
        include: {
          drug: true,
          fields: true,
        },
      },
    },
  });

  if (!doc) redirect("/clinic");
  await assertPatientAccess(session, doc.visit.patientId);

  const canEdit = session.role === "CLINICIAN" || session.role === "PHARMACIST" || session.role === "ADMIN";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SourceViewer
        document={{
          id: doc.id,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          status: doc.status,
          pageCount: doc.pageCount,
          patientId: doc.visit.patientId,
          patientName: doc.visit.patient.name,
          facility: doc.visit.facility,
        }}
        lines={doc.lines}
        entries={doc.entries as any}
        initialLineId={initialLineId}
        canEdit={canEdit}
      />
    </div>
  );
}

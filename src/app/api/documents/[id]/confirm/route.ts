import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole, assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { detectDiscrepancies } from "@/lib/discrepancy/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const docId = params.id;

  try {
    assertRole(session, [Role.CLINICIAN, Role.PHARMACIST, Role.ADMIN]);

    const doc = await db.sourceDocument.findUnique({
      where: { id: docId },
      include: {
        visit: true,
        entries: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await assertPatientAccess(session, doc.visit.patientId);

    // Transactionally confirm document and all its entries
    await db.$transaction(async (tx) => {
      await tx.sourceDocument.update({
        where: { id: docId },
        data: { status: "CONFIRMED" },
      });

      await tx.medicationEntry.updateMany({
        where: { documentId: docId },
        data: {
          confirmed: true,
          confirmedById: session.id,
        },
      });
    });

    await writeAuditLog({
      actorId: session.id,
      actorRole: session.role,
      action: "document.confirmed",
      entityType: "DOCUMENT",
      entityId: doc.id,
      patientId: doc.visit.patientId,
      payload: {
        documentId: doc.id,
        entriesConfirmedCount: doc.entries.length,
      },
    });

    // Run discrepancy detection engine immediately after document confirmation
    const discrepancies = await detectDiscrepancies(doc.visit.patientId, {
      id: session.id,
      role: session.role,
    });

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      status: "CONFIRMED",
      detectedDiscrepancies: discrepancies.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

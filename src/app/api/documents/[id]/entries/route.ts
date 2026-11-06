import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole, assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { assertNoClinicalAdvice } from "@/lib/safety";
import { normalizeDrugName, parseStrength } from "@/lib/normalize";

const ManualEntrySchema = z.object({
  drugName: z.string().min(1),
  strengthRaw: z.string().optional().nullable(),
  formRaw: z.string().optional().nullable(),
  instructionRaw: z.string().optional().nullable(),
  lineId: z.string().optional().nullable(),
});

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
      include: { visit: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await assertPatientAccess(session, doc.visit.patientId);

    const body = await req.json();
    const parsed = ManualEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid manual entry input", details: parsed.error }, { status: 400 });
    }

    const { drugName, strengthRaw, formRaw, instructionRaw, lineId } = parsed.data;

    assertNoClinicalAdvice(instructionRaw);

    const match = await normalizeDrugName(drugName);
    const { strengthValue, strengthUnit } = parseStrength(strengthRaw);

    // Fetch line if specified to extract bounding box coordinates
    let line = null;
    if (lineId) {
      line = await db.documentLine.findUnique({ where: { id: lineId } });
    }

    const entry = await db.medicationEntry.create({
      data: {
        visitId: doc.visitId,
        documentId: doc.id,
        drugId: match?.drugId ?? null,
        drugNameRaw: drugName,
        strengthRaw: strengthRaw ?? null,
        strengthValue,
        strengthUnit,
        formRaw: formRaw ?? "Tablet",
        instructionRaw: instructionRaw ?? null,
        confirmed: true,
        confirmedById: session.id,
      },
    });

    if (line) {
      await db.extractedField.create({
        data: {
          entryId: entry.id,
          documentId: doc.id,
          fieldName: "manualEntry",
          rawText: `${drugName} ${strengthRaw || ""} ${instructionRaw || ""}`.trim(),
          lineId: line.id,
          page: line.page,
          x: line.x,
          y: line.y,
          w: line.w,
          h: line.h,
          confidence: 1.0,
          needsReview: false,
        },
      });
    }

    await writeAuditLog({
      actorId: session.id,
      actorRole: session.role,
      action: "entry.corrected",
      entityType: "MEDICATION_ENTRY",
      entityId: entry.id,
      patientId: doc.visit.patientId,
      payload: {
        manualEntry: true,
        drugName,
        strengthRaw,
        instructionRaw,
        lineId,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

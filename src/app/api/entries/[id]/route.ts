import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole, assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { assertNoClinicalAdvice } from "@/lib/safety";
import { normalizeDrugName, parseStrength } from "@/lib/normalize";
import { detectDiscrepancies } from "@/lib/discrepancy/engine";

const CorrectEntrySchema = z.object({
  drugNameRaw: z.string().optional(),
  strengthRaw: z.string().optional(),
  formRaw: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const entryId = params.id;

  try {
    assertRole(session, [Role.CLINICIAN, Role.PHARMACIST, Role.ADMIN]);

    const entry = await db.medicationEntry.findUnique({
      where: { id: entryId },
      include: {
        visit: true,
        fields: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await assertPatientAccess(session, entry.visit.patientId);

    const body = await req.json();
    const parsed = CorrectEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid correction data", details: parsed.error }, { status: 400 });
    }

    const { drugNameRaw, strengthRaw, formRaw } = parsed.data;

    let updateData: Record<string, any> = {};
    const corrections: Record<string, { from: any; to: any }> = {};

    if (drugNameRaw && drugNameRaw !== entry.drugNameRaw) {
      corrections.drugNameRaw = { from: entry.drugNameRaw, to: drugNameRaw };
      const match = await normalizeDrugName(drugNameRaw);
      updateData.drugNameRaw = drugNameRaw;
      updateData.drugId = match?.drugId ?? null;
    }

    if (strengthRaw !== undefined && strengthRaw !== entry.strengthRaw) {
      corrections.strengthRaw = { from: entry.strengthRaw, to: strengthRaw };
      const { strengthValue, strengthUnit } = parseStrength(strengthRaw);
      updateData.strengthRaw = strengthRaw;
      updateData.strengthValue = strengthValue;
      updateData.strengthUnit = strengthUnit;
    }

    if (formRaw && formRaw !== entry.formRaw) {
      corrections.formRaw = { from: entry.formRaw, to: formRaw };
      updateData.formRaw = formRaw;
    }

    const updated = await db.medicationEntry.update({
      where: { id: entryId },
      data: updateData,
    });

    // Record correctedFrom on linked ExtractedField
    for (const [fieldKey, val] of Object.entries(corrections)) {
      const matchField = entry.fields.find((f) => f.fieldName.toLowerCase().includes(fieldKey.replace("Raw", "").toLowerCase()));
      if (matchField) {
        await db.extractedField.update({
          where: { id: matchField.id },
          data: {
            correctedFrom: String(val.from),
            rawText: String(val.to),
            needsReview: false,
          },
        });
      }
    }

    await writeAuditLog({
      actorId: session.id,
      actorRole: session.role,
      action: "entry.corrected",
      entityType: "MEDICATION_ENTRY",
      entityId: entry.id,
      patientId: entry.visit.patientId,
      payload: {
        entryId: entry.id,
        corrections,
      },
    });

    // If entry was confirmed, re-run detection engine
    if (entry.confirmed) {
      await detectDiscrepancies(entry.visit.patientId, {
        id: session.id,
        role: session.role,
      });
    }

    return NextResponse.json({ entry: updated, corrections });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

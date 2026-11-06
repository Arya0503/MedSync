import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role, ReviewStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole, assertPatientAccess, assertCanApproveDiscrepancy } from "@/lib/rbac";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const ActionSchema = z.object({
  action: z.enum([ReviewStatus.APPROVED, ReviewStatus.REJECTED, ReviewStatus.ESCALATED]),
  note: z.string().optional().nullable(),
  approvedEntryId: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const discrepancyId = params.id;

  try {
    assertRole(session, [Role.CLINICIAN, Role.PHARMACIST, Role.ADMIN]);

    const discrepancy = await db.discrepancy.findUnique({
      where: { id: discrepancyId },
      include: { patient: true },
    });

    if (!discrepancy) {
      return NextResponse.json({ error: "Discrepancy not found" }, { status: 404 });
    }

    await assertPatientAccess(session, discrepancy.patientId);

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action payload", details: parsed.error }, { status: 400 });
    }

    const { action, note, approvedEntryId } = parsed.data;

    // Check approval permissions: only Pharmacists can approve
    if (action === ReviewStatus.APPROVED) {
      assertCanApproveDiscrepancy(session);

      // Verify that approvedEntryId is one of the existing source entries
      if (!approvedEntryId || !discrepancy.entryIds.includes(approvedEntryId)) {
        return NextResponse.json(
          { error: "To approve a discrepancy, a reviewer must select one of the authentic source entries." },
          { status: 400 }
        );
      }
    }

    // Execute in transaction
    const result = await db.$transaction(async (tx) => {
      const reviewAction = await tx.reviewAction.create({
        data: {
          discrepancyId,
          reviewerId: session.id,
          action,
          note: note ?? null,
          approvedEntryId: approvedEntryId ?? null,
        },
      });

      const updatedDiscrepancy = await tx.discrepancy.update({
        where: { id: discrepancyId },
        data: {
          status: action,
          resolvedAt: action === ReviewStatus.ESCALATED ? null : new Date(),
        },
      });

      return { reviewAction, updatedDiscrepancy };
    });

    const auditActionMap: Record<string, any> = {
      APPROVED: "discrepancy.approved",
      REJECTED: "discrepancy.rejected",
      ESCALATED: "discrepancy.escalated",
    };

    await writeAuditLog({
      actorId: session.id,
      actorRole: session.role,
      action: auditActionMap[action],
      entityType: "DISCREPANCY",
      entityId: discrepancy.id,
      patientId: discrepancy.patientId,
      payload: {
        discrepancyId: discrepancy.id,
        drugLabel: discrepancy.drugLabel,
        action,
        note,
        approvedEntryId,
      },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

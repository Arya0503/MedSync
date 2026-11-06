import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertAuthenticated, assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const GrantSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const patientId = params.id;

  try {
    assertAuthenticated(session);
    await assertPatientAccess(session, patientId);

    const body = await req.json();
    const parsed = GrantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid grant input" }, { status: 400 });
    }

    const targetUserId = parsed.data.userId;

    const grant = await db.accessGrant.upsert({
      where: {
        patientId_userId: {
          patientId,
          userId: targetUserId,
        },
      },
      update: {
        revokedAt: null,
        grantedAt: new Date(),
      },
      create: {
        patientId,
        userId: targetUserId,
      },
    });

    await writeAuditLog({
      actorId: session.id,
      actorRole: session.role,
      action: "grant.created",
      entityType: "ACCESS_GRANT",
      entityId: grant.id,
      patientId,
      payload: { targetUserId, grantedBy: session.id },
    });

    return NextResponse.json({ grant }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const patientId = params.id;

  try {
    assertAuthenticated(session);
    await assertPatientAccess(session, patientId);

    const body = await req.json();
    const parsed = GrantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid grant input" }, { status: 400 });
    }

    const targetUserId = parsed.data.userId;

    const grant = await db.accessGrant.update({
      where: {
        patientId_userId: {
          patientId,
          userId: targetUserId,
        },
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await writeAuditLog({
      actorId: session.id,
      actorRole: session.role,
      action: "grant.revoked",
      entityType: "ACCESS_GRANT",
      entityId: grant.id,
      patientId,
      payload: { targetUserId, revokedBy: session.id },
    });

    return NextResponse.json({ grant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

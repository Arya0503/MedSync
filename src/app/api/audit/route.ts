import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertAuthenticated, assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();

  try {
    assertAuthenticated(session);

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    const whereClause: any = {};

    if (session.role === Role.PATIENT) {
      // Patients can only view audit trail of their own record
      if (!session.patientId) {
        return NextResponse.json({ logs: [] });
      }
      whereClause.patientId = session.patientId;
    } else if (session.role !== Role.ADMIN) {
      // Clinician / Pharmacist: must have grant if querying a specific patient
      if (patientId) {
        await assertPatientAccess(session, patientId);
        whereClause.patientId = patientId;
      } else {
        const activeGrants = await db.accessGrant.findMany({
          where: { userId: session.id, revokedAt: null },
          select: { patientId: true },
        });
        whereClause.patientId = { in: activeGrants.map((g) => g.patientId) };
      }
    } else {
      // Admin can query any or all
      if (patientId) {
        whereClause.patientId = patientId;
      }
    }

    const logs = await db.auditLog.findMany({
      where: whereClause,
      orderBy: { seq: "desc" },
      take: 100,
    });

    // Convert BigInt seq to string for JSON serialization
    const serialized = logs.map((log) => ({
      ...log,
      seq: log.seq.toString(),
    }));

    return NextResponse.json({ logs: serialized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

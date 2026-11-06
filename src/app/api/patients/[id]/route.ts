import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const patientId = params.id;

  try {
    await assertPatientAccess(session, patientId);

    const patient = await db.patient.findUnique({
      where: { id: patientId },
      include: {
        visits: {
          orderBy: { visitDate: "asc" },
          include: {
            documents: {
              orderBy: { createdAt: "desc" },
            },
            entries: {
              orderBy: { createdAt: "asc" },
              include: { drug: true, fields: true },
            },
          },
        },
        discrepancies: {
          orderBy: { detectedAt: "desc" },
          include: { actions: { orderBy: { createdAt: "desc" } } },
        },
        cards: {
          orderBy: { createdAt: "desc" },
        },
        grants: {
          where: { revokedAt: null },
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

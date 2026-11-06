import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole, assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";

const CreateVisitSchema = z.object({
  facility: z.string().min(2),
  visitType: z.string().min(2),
  visitDate: z.string(), // ISO date string
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const patientId = params.id;

  try {
    await assertPatientAccess(session, patientId);

    const visits = await db.visit.findMany({
      where: { patientId },
      orderBy: { visitDate: "asc" },
      include: {
        documents: true,
        entries: { include: { drug: true } },
      },
    });

    return NextResponse.json({ visits });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const patientId = params.id;

  try {
    await assertPatientAccess(session, patientId);
    assertRole(session, [Role.CLINICIAN, Role.PHARMACIST, Role.ADMIN]);

    const body = await req.json();
    const parsed = CreateVisitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid visit data", details: parsed.error }, { status: 400 });
    }

    const { facility, visitType, visitDate } = parsed.data;

    const visit = await db.visit.create({
      data: {
        patientId,
        facility,
        visitType,
        visitDate: new Date(visitDate),
      },
    });

    return NextResponse.json({ visit }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

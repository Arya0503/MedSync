import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertAuthenticated, assertRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const CreatePatientSchema = z.object({
  name: z.string().min(2),
  mrn: z.string().min(3),
  dob: z.string(), // ISO date string
});

export async function GET() {
  const session = await getSession();
  try {
    assertAuthenticated(session);

    if (session.role === Role.PATIENT) {
      if (!session.patientId) {
        return NextResponse.json({ patients: [] });
      }
      const patient = await db.patient.findUnique({
        where: { id: session.patientId },
        include: { visits: { orderBy: { visitDate: "desc" } } },
      });
      return NextResponse.json({ patients: patient ? [patient] : [] });
    }

    if (session.role === Role.ADMIN) {
      const allPatients = await db.patient.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          visits: { orderBy: { visitDate: "desc" }, take: 1 },
          discrepancies: { where: { status: "PENDING" } },
        },
      });
      return NextResponse.json({ patients: allPatients });
    }

    // Clinician & Pharmacist: filter by active AccessGrant
    const granted = await db.accessGrant.findMany({
      where: {
        userId: session.id,
        revokedAt: null,
      },
      include: {
        patient: {
          include: {
            visits: { orderBy: { visitDate: "desc" }, take: 1 },
            discrepancies: { where: { status: "PENDING" } },
          },
        },
      },
    });

    const patients = granted.map((g) => g.patient);
    return NextResponse.json({ patients });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    assertRole(session, [Role.CLINICIAN, Role.ADMIN]);

    const body = await req.json();
    const parsed = CreatePatientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid patient data", details: parsed.error }, { status: 400 });
    }

    const { name, mrn, dob } = parsed.data;

    const patient = await db.patient.create({
      data: {
        name,
        mrn,
        dob: new Date(dob),
        isSynthetic: true,
      },
    });

    // Automatically grant creating clinician access
    await db.accessGrant.create({
      data: {
        patientId: patient.id,
        userId: session.id,
      },
    });

    await writeAuditLog({
      actorId: session.id,
      actorRole: session.role,
      action: "patient.created",
      entityType: "PATIENT",
      entityId: patient.id,
      patientId: patient.id,
      payload: { name: patient.name, mrn: patient.mrn },
    });

    return NextResponse.json({ patient }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

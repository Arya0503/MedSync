import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const docId = params.id;

  try {
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

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await assertPatientAccess(session, doc.visit.patientId);

    return NextResponse.json({ document: doc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";
import { readFile } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const docId = params.id;

  try {
    const doc = await db.sourceDocument.findUnique({
      where: { id: docId },
      include: { visit: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await assertPatientAccess(session, doc.visit.patientId);

    const buffer = await readFile(doc.storagePath);

    return new Response(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${doc.fileName}"`,
        "Content-Length": buffer.length.toString(),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

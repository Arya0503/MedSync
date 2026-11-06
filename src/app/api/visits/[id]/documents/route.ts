import { NextRequest, NextResponse } from "next/server";
import { cuid } from "@/lib/cuid";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";
import { saveFile } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { processDocumentExtraction } from "@/lib/extraction/pipeline";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const visitId = params.id;

  try {
    const visit = await db.visit.findUnique({
      where: { id: visitId },
      include: { patient: true },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    await assertPatientAccess(session, visit.patientId);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const docId = cuid();

    const stored = await saveFile(visit.patientId, docId, buffer, file.name);

    // Check for duplicate sha256
    const existingDoc = await db.sourceDocument.findFirst({
      where: { sha256: stored.sha256 },
    });

    const doc = await db.sourceDocument.create({
      data: {
        id: docId,
        visitId,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        storagePath: stored.storagePath,
        sha256: stored.sha256,
        status: "UPLOADED",
        uploadedById: session?.id ?? "anonymous",
      },
    });

    await writeAuditLog({
      actorId: session?.id ?? "anonymous",
      actorRole: session?.role ?? "PATIENT",
      action: "document.uploaded",
      entityType: "DOCUMENT",
      entityId: doc.id,
      patientId: visit.patientId,
      payload: {
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        size: stored.size,
        isDuplicate: Boolean(existingDoc),
      },
    });

    // Run extraction pipeline
    let extractionResult = null;
    try {
      extractionResult = await processDocumentExtraction(doc.id, {
        id: session?.id,
        role: session?.role,
      });
    } catch (extractErr) {
      console.warn("Background extraction processing error:", extractErr);
    }

    return NextResponse.json(
      {
        document: doc,
        extraction: extractionResult,
        warning: existingDoc ? "A document with identical content (SHA-256) was previously uploaded." : null,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Document upload failed:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

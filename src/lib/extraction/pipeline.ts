import { DocStatus } from "@prisma/client";
import { db } from "../db";
import { writeAuditLog } from "../audit";
import { readFile } from "../storage";
import { extractLinesFromPdf } from "./pdfText";
import { extractLinesFromImage } from "./ocr";
import { parseMedicationLine } from "./parser";
import { normalizeDrugName } from "../normalize";

export interface PipelineResult {
  documentId: string;
  status: DocStatus;
  linesCount: number;
  entriesCount: number;
  needsReviewCount: number;
}

const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD || "0.80");

/**
 * Executes the complete local extraction pipeline for an uploaded SourceDocument.
 */
export async function processDocumentExtraction(
  documentId: string,
  actor?: { id?: string; role?: string }
): Promise<PipelineResult> {
  const doc = await db.sourceDocument.findUnique({
    where: { id: documentId },
    include: { visit: true },
  });

  if (!doc) {
    throw new Error(`Document not found: ${documentId}`);
  }

  // Update status to PROCESSING
  await db.sourceDocument.update({
    where: { id: documentId },
    data: { status: DocStatus.PROCESSING },
  });

  try {
    const fileBuffer = await readFile(doc.storagePath);
    let extracted: { lines: Array<any>; pageCount: number };

    if (doc.mimeType === "application/pdf") {
      extracted = await extractLinesFromPdf(fileBuffer);
    } else {
      extracted = await extractLinesFromImage(fileBuffer);
    }

    const { lines, pageCount } = extracted;

    // Update pageCount in DB
    await db.sourceDocument.update({
      where: { id: documentId },
      data: {
        pageCount: Math.max(1, pageCount),
        extractionMethod: "RULE_BASED_LOCAL",
      },
    });

    // Write DocumentLine records
    // Clear any previous lines if re-processing
    await db.documentLine.deleteMany({ where: { documentId } });

    const createdLines = await db.$transaction(
      lines.map((l) =>
        db.documentLine.create({
          data: {
            documentId,
            page: l.page,
            lineIndex: l.lineIndex,
            text: l.text,
            x: l.x,
            y: l.y,
            w: l.w,
            h: l.h,
            ocrConfidence: l.confidence,
          },
        })
      )
    );

    // Structure medication entries from lines
    let entriesCount = 0;
    let needsReviewCount = 0;

    for (const line of createdLines) {
      const parsed = parseMedicationLine(line.text, line.ocrConfidence ?? 0.95);
      if (!parsed) continue;

      // Drug Normalization
      const match = await normalizeDrugName(parsed.drugNameRaw);
      const isFuzzy = match?.matchType.startsWith("FUZZY") ?? false;
      const drugId = match?.drugId ?? null;

      // Determine confidence: min of parse confidence and match confidence
      const confidence = match ? Math.min(parsed.confidence, match.confidence) : parsed.confidence * 0.75;
      const fieldNeedsReview = confidence < CONFIDENCE_THRESHOLD || isFuzzy || !parsed.instructionRaw;

      if (fieldNeedsReview) {
        needsReviewCount++;
      }

      // Create MedicationEntry in database
      const entry = await db.medicationEntry.create({
        data: {
          visitId: doc.visitId,
          documentId: doc.id,
          drugId,
          drugNameRaw: parsed.drugNameRaw,
          strengthRaw: parsed.strengthRaw,
          strengthValue: parsed.strengthValue,
          strengthUnit: parsed.strengthUnit,
          formRaw: parsed.formRaw,
          instructionRaw: parsed.instructionRaw,
          confirmed: false, // Requires human confirmation
        },
      });

      entriesCount++;

      // Create ExtractedField links for source tracing (drugName, strength, instruction)
      const fieldsToLink = [
        { name: "drugName", text: parsed.drugNameRaw, conf: match?.confidence ?? 0.8 },
        { name: "strength", text: parsed.strengthRaw || "", conf: parsed.confidence },
        { name: "instruction", text: parsed.instructionRaw || "", conf: parsed.instructionRaw ? parsed.confidence : 0.4 },
      ];

      for (const f of fieldsToLink) {
        if (!f.text) continue;
        await db.extractedField.create({
          data: {
            entryId: entry.id,
            documentId: doc.id,
            fieldName: f.name,
            rawText: f.text,
            lineId: line.id,
            page: line.page,
            x: line.x,
            y: line.y,
            w: line.w,
            h: line.h,
            confidence: f.conf,
            needsReview: f.conf < CONFIDENCE_THRESHOLD,
          },
        });
      }
    }

    // Determine document final status
    const finalDocStatus = entriesCount === 0 || needsReviewCount > 0 ? DocStatus.NEEDS_REVIEW : DocStatus.NEEDS_REVIEW;

    await db.sourceDocument.update({
      where: { id: documentId },
      data: { status: finalDocStatus },
    });

    // Write audit log
    await writeAuditLog({
      actorId: actor?.id ?? doc.uploadedById,
      actorRole: actor?.role ?? "CLINICIAN",
      action: "document.extracted",
      entityType: "DOCUMENT",
      entityId: doc.id,
      patientId: doc.visit.patientId,
      payload: {
        documentId: doc.id,
        linesCount: createdLines.length,
        entriesCount,
        needsReviewCount,
        status: finalDocStatus,
      },
    });

    return {
      documentId,
      status: finalDocStatus,
      linesCount: createdLines.length,
      entriesCount,
      needsReviewCount,
    };
  } catch (error: any) {
    console.error("Extraction pipeline failed for doc", documentId, error);
    await db.sourceDocument.update({
      where: { id: documentId },
      data: { status: DocStatus.FAILED },
    });
    throw error;
  }
}

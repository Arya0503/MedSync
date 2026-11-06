import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "./db";
import { writeAuditLog } from "./audit";
import { PERSISTENT_SAFETY_NOTICE } from "./safety";
import { getMedicationPatientStatus } from "./discrepancy/engine";

export async function generateHandoverPdf(
  patientId: string,
  actor?: { id?: string; role?: string }
): Promise<Uint8Array> {
  const patient = await db.patient.findUnique({
    where: { id: patientId },
    include: {
      visits: {
        orderBy: { visitDate: "asc" },
        include: {
          entries: {
            where: { confirmed: true },
            include: { drug: true, visit: true },
          },
        },
      },
    },
  });

  if (!patient) throw new Error("Patient not found");

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let y = height - 50;

  // Header
  page.drawText("MedBridge Handover Summary", {
    x: 50,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.08, 0.48, 0.37), // Forest Tea
  });

  y -= 25;
  page.drawText(`Generated on: ${new Date().toISOString().replace("T", " ").substring(0, 19)} UTC`, {
    x: 50,
    y,
    size: 10,
    font: fontRegular,
    color: rgb(0.24, 0.35, 0.32),
  });

  y -= 25;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.81, 0.94, 0.90),
  });

  y -= 30;
  // Patient details box
  page.drawText("PATIENT DETAILS", {
    x: 50,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.08, 0.48, 0.37),
  });

  y -= 18;
  page.drawText(`Name: ${patient.name}        Record (MRN): ${patient.mrn}        DOB: ${patient.dob.toISOString().split("T")[0]}`, {
    x: 50,
    y,
    size: 10,
    font: fontRegular,
    color: rgb(0.06, 0.16, 0.14),
  });

  y -= 35;
  // Gather medications
  const allEntries = patient.visits.flatMap((v) => v.entries);
  const drugMap = new Map<string, typeof allEntries[0][]>();

  for (const entry of allEntries) {
    const key = entry.drugId ?? entry.drugNameRaw.toLowerCase().trim();
    if (!drugMap.has(key)) drugMap.set(key, []);
    drugMap.get(key)!.push(entry);
  }

  const verifiedItems = [];
  const pendingItems = [];

  for (const [, entries] of drugMap.entries()) {
    entries.sort((a: any, b: any) => a.visit.visitDate.getTime() - b.visit.visitDate.getTime());
    const latest = entries[entries.length - 1];
    const drugLabel = latest.drug?.canonicalName ?? latest.drugNameRaw;
    const status = await getMedicationPatientStatus(patientId, latest.drugId, drugLabel);

    if (status.statusText === "Verified") {
      let instruction = latest.instructionRaw || "As directed";
      if (status.approvedEntryId) {
        const approved = entries.find((e: any) => e.id === status.approvedEntryId);
        if (approved?.instructionRaw) instruction = approved.instructionRaw;
      }
      verifiedItems.push({
        drug: drugLabel,
        strength: latest.strengthRaw || "—",
        instruction,
        source: `${latest.visit.facility} (${latest.visit.visitDate.toISOString().split("T")[0]})`,
      });
    } else {
      pendingItems.push({
        drug: drugLabel,
        status: status.statusText,
        source: `${latest.visit.facility} (${latest.visit.visitDate.toISOString().split("T")[0]})`,
      });
    }
  }

  // 1. Verified Medications
  page.drawText("VERIFIED MEDICATIONS", {
    x: 50,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.08, 0.48, 0.37),
  });
  y -= 15;

  if (verifiedItems.length === 0) {
    page.drawText("No verified medications recorded at this time.", {
      x: 50,
      y,
      size: 10,
      font: fontOblique,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 25;
  } else {
    for (const item of verifiedItems) {
      page.drawText(`• ${item.drug} ${item.strength}`, {
        x: 50,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.06, 0.16, 0.14),
      });
      y -= 14;
      page.drawText(`  Verbatim Instruction: "${item.instruction}"`, {
        x: 50,
        y,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 12;
      page.drawText(`  Source: ${item.source}`, {
        x: 50,
        y,
        size: 8.5,
        font: fontOblique,
        color: rgb(0.3, 0.4, 0.35),
      });
      y -= 18;
    }
  }

  y -= 15;
  // 2. Unresolved / Pending Items
  page.drawText("UNRESOLVED / PENDING PROFESSIONAL REVIEW", {
    x: 50,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.6, 0.2, 0.1),
  });
  y -= 15;

  if (pendingItems.length === 0) {
    page.drawText("No unresolved discrepancies pending.", {
      x: 50,
      y,
      size: 10,
      font: fontOblique,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 25;
  } else {
    for (const item of pendingItems) {
      page.drawText(`• ${item.drug} — [Status: ${item.status}]`, {
        x: 50,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.6, 0.2, 0.1),
      });
      y -= 12;
      page.drawText(`  Action: Requires reconciliation by pharmacist/clinician before clinical reliance.`, {
        x: 50,
        y,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 16;
    }
  }

  // Footer Safety Notice
  page.drawLine({
    start: { x: 50, y: 70 },
    end: { x: width - 50, y: 70 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText(PERSISTENT_SAFETY_NOTICE, {
    x: 50,
    y: 50,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
    maxWidth: width - 100,
    lineHeight: 10,
  });

  const pdfBytes = await pdfDoc.save();

  await writeAuditLog({
    actorId: actor?.id ?? "system",
    actorRole: actor?.role ?? "USER",
    action: "pdf.exported",
    entityType: "PATIENT",
    entityId: patientId,
    patientId,
    payload: {
      patientId,
      verifiedCount: verifiedItems.length,
      pendingCount: pendingItems.length,
      fileSize: pdfBytes.length,
    },
  });

  return pdfBytes;
}

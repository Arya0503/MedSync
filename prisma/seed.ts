import { PrismaClient, Role, Severity, DiscrepancyType } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const prisma = new PrismaClient();

const STORAGE_ROOT = path.resolve(process.cwd(), process.env.STORAGE_DIR || "./storage");

async function hashPw(pw: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
}

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function writeAudit(
  tx: any,
  actorId: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string,
  patientId: string | null,
  payload: any
) {
  const last = await tx.auditLog.findFirst({
    orderBy: { seq: "desc" },
    select: { hash: true },
  });
  const prevHash = last?.hash ?? "GENESIS";
  const ts = new Date();
  const body = JSON.stringify({
    action,
    actorId,
    actorRole,
    entityId,
    entityType,
    patientId,
    payload,
    prevHash,
    ts: ts.toISOString(),
  });
  const hash = sha256(prevHash + body);

  return tx.auditLog.create({
    data: {
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      patientId,
      payload,
      prevHash,
      hash,
      ts,
    },
  });
}

/**
 * Creates a real, clean clinical PDF with pdf-lib and returns the buffer
 */
async function generateSamplePdf(
  facility: string,
  title: string,
  dateStr: string,
  patientName: string,
  mrn: string,
  medications: Array<{ drug: string; strength: string; instruction: string }>
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  let y = 780;

  page.drawText(facility, { x: 50, y, size: 16, font: fontBold, color: rgb(0.08, 0.48, 0.37) });
  y -= 22;
  page.drawText(`${title} — Date: ${dateStr}`, { x: 50, y, size: 11, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  y -= 20;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 25;

  page.drawText(`Patient: ${patientName}    MRN: ${mrn}    DOB: 1959-05-12`, {
    x: 50,
    y,
    size: 10,
    font: fontRegular,
  });
  y -= 30;

  page.drawText("Prescribed Medications & Regimen:", { x: 50, y, size: 12, font: fontBold });
  y -= 22;

  let idx = 1;
  for (const med of medications) {
    const lineText = `${idx}. ${med.drug} ${med.strength}: ${med.instruction}`;
    page.drawText(lineText, { x: 55, y, size: 10, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    y -= 24;
    idx++;
  }

  y -= 30;
  page.drawText("Clinical Verification Signature: Verified by Attending Physician", {
    x: 50,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

export async function main() {
  console.log("🌱 Starting MedBridge synthetic seed...");

  // 1. Seed Drugs & Aliases
  const drugData = [
    {
      name: "Metformin",
      rxnorm: "6809",
      aliases: ["Glucophage", "Riomet", "Fortamet", "Metformin Hydrochloride"],
    },
    {
      name: "Amlodipine",
      rxnorm: "17767",
      aliases: ["Norvasc", "Amlodipine Besylate", "Amvaz"],
    },
    {
      name: "Atorvastatin",
      rxnorm: "83367",
      aliases: ["Lipitor", "Atorvastatin Calcium", "Storvas"],
    },
    {
      name: "Pantoprazole",
      rxnorm: "40790",
      aliases: ["Pantocid", "Protonix", "Pantoprazole Sodium"],
    },
    {
      name: "Aspirin",
      rxnorm: "1191",
      aliases: ["Ecosprin", "Disprin", "Acetylsalicylic Acid"],
    },
  ];

  const drugMap: Record<string, string> = {};

  for (const d of drugData) {
    const created = await prisma.drug.upsert({
      where: { canonicalName: d.name },
      update: {},
      create: {
        canonicalName: d.name,
        rxnormId: d.rxnorm,
        aliases: {
          create: d.aliases.map((a) => ({ alias: a })),
        },
      },
    });
    drugMap[d.name] = created.id;
  }
  console.log("✓ Drugs and aliases populated");

  // 2. Seed Users
  const passwordHash = await hashPw("Demo@1234");

  // Demo Patient: Asha R.
  const patient = await prisma.patient.upsert({
    where: { mrn: "SYN-0042" },
    update: {},
    create: {
      name: "Asha R.",
      mrn: "SYN-0042",
      dob: new Date("1959-05-12"),
      isSynthetic: true,
    },
  });

  const patientUser = await prisma.user.upsert({
    where: { email: "patient@demo.test" },
    update: {},
    create: {
      name: "Asha R.",
      email: "patient@demo.test",
      passwordHash,
      role: Role.PATIENT,
      patientId: patient.id,
      settings: {
        create: { language: "en", bgMotion: true },
      },
    },
  });

  const clinicianUser = await prisma.user.upsert({
    where: { email: "clinician@demo.test" },
    update: {},
    create: {
      name: "Dr. Arvind Mehta",
      email: "clinician@demo.test",
      passwordHash,
      role: Role.CLINICIAN,
      settings: {
        create: { language: "en", bgMotion: true },
      },
    },
  });

  const pharmacistUser = await prisma.user.upsert({
    where: { email: "pharmacist@demo.test" },
    update: {},
    create: {
      name: "Priya Sundaram, PharmD",
      email: "pharmacist@demo.test",
      passwordHash,
      role: Role.PHARMACIST,
      settings: {
        create: { language: "en", bgMotion: true },
      },
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.test" },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@demo.test",
      passwordHash,
      role: Role.ADMIN,
      settings: {
        create: { language: "en", bgMotion: true },
      },
    },
  });

  // Access Grants
  await prisma.accessGrant.upsert({
    where: { patientId_userId: { patientId: patient.id, userId: clinicianUser.id } },
    update: { revokedAt: null },
    create: { patientId: patient.id, userId: clinicianUser.id },
  });

  await prisma.accessGrant.upsert({
    where: { patientId_userId: { patientId: patient.id, userId: pharmacistUser.id } },
    update: { revokedAt: null },
    create: { patientId: patient.id, userId: pharmacistUser.id },
  });

  console.log("✓ Demo users and access grants created");

  // 3. Clear previous visits and discrepancies for demo patient to ensure clean test state
  await prisma.discrepancy.deleteMany({ where: { patientId: patient.id } });
  await prisma.visit.deleteMany({ where: { patientId: patient.id } });

  // 4. Seed the 3 Visits and Generate Real PDFs
  const patientFolder = path.join(STORAGE_ROOT, patient.id);
  await fs.mkdir(patientFolder, { recursive: true });

  // Visit 1: Clinic A (prescription) 2026-03-02
  const v1 = await prisma.visit.create({
    data: {
      patientId: patient.id,
      facility: "Clinic A",
      visitType: "Prescription",
      visitDate: new Date("2026-03-02T10:00:00Z"),
    },
  });

  const v1Meds = [
    { drug: "Metformin", strength: "500 mg", instruction: "1 tablet twice daily after meals" },
    { drug: "Amlodipine", strength: "5 mg", instruction: "1 tablet once daily, morning" },
    { drug: "Atorvastatin", strength: "10 mg", instruction: "1 tablet at night" },
    { drug: "Pantoprazole", strength: "40 mg", instruction: "once daily before breakfast" },
  ];

  const v1PdfBuffer = await generateSamplePdf("Clinic A", "Outpatient Prescription", "2026-03-02", "Asha R.", "SYN-0042", v1Meds);
  const v1DocId = "doc_v1_clinica";
  const v1Path = path.join(patientFolder, `${v1DocId}.pdf`);
  await fs.writeFile(v1Path, v1PdfBuffer);

  const doc1 = await prisma.sourceDocument.create({
    data: {
      id: v1DocId,
      visitId: v1.id,
      fileName: "ClinicA_Prescription_20260302.pdf",
      mimeType: "application/pdf",
      storagePath: path.join("./storage", patient.id, `${v1DocId}.pdf`).replace(/\\/g, "/"),
      sha256: sha256(v1PdfBuffer.toString("hex")),
      status: "CONFIRMED",
      uploadedById: clinicianUser.id,
      pageCount: 1,
    },
  });

  for (let i = 0; i < v1Meds.length; i++) {
    const med = v1Meds[i];
    const line = await prisma.documentLine.create({
      data: {
        documentId: doc1.id,
        page: 1,
        lineIndex: i + 1,
        text: `${i + 1}. ${med.drug} ${med.strength}: ${med.instruction}`,
        x: 0.1,
        y: 0.35 + i * 0.05,
        w: 0.8,
        h: 0.03,
        ocrConfidence: 0.98,
      },
    });

    const entry = await prisma.medicationEntry.create({
      data: {
        visitId: v1.id,
        documentId: doc1.id,
        drugId: drugMap[med.drug],
        drugNameRaw: med.drug,
        strengthRaw: med.strength,
        formRaw: "Tablet",
        instructionRaw: med.instruction,
        confirmed: true,
        confirmedById: clinicianUser.id,
      },
    });

    await prisma.extractedField.create({
      data: {
        entryId: entry.id,
        documentId: doc1.id,
        fieldName: "instruction",
        rawText: med.instruction,
        lineId: line.id,
        page: 1,
        x: line.x,
        y: line.y,
        w: line.w,
        h: line.h,
        confidence: 0.98,
        needsReview: false,
      },
    });
  }

  // Visit 2: City Hospital (discharge) 2026-08-14
  const v2 = await prisma.visit.create({
    data: {
      patientId: patient.id,
      facility: "City Hospital",
      visitType: "Discharge Summary",
      visitDate: new Date("2026-08-14T14:30:00Z"),
    },
  });

  const v2Meds = [
    { drug: "Metformin", strength: "1000 mg", instruction: "1 tablet twice daily" },
    { drug: "Amlodipine", strength: "5 mg", instruction: "1 tablet once daily, morning" },
    { drug: "Atorvastatin", strength: "20 mg", instruction: "1 tablet at night" },
    { drug: "Aspirin", strength: "75 mg", instruction: "once daily (new)" },
  ];

  const v2PdfBuffer = await generateSamplePdf("City Hospital", "Hospital Discharge Summary", "2026-08-14", "Asha R.", "SYN-0042", v2Meds);
  const v2DocId = "doc_v2_cityhosp";
  const v2Path = path.join(patientFolder, `${v2DocId}.pdf`);
  await fs.writeFile(v2Path, v2PdfBuffer);

  const doc2 = await prisma.sourceDocument.create({
    data: {
      id: v2DocId,
      visitId: v2.id,
      fileName: "CityHospital_Discharge_20260814.pdf",
      mimeType: "application/pdf",
      storagePath: path.join("./storage", patient.id, `${v2DocId}.pdf`).replace(/\\/g, "/"),
      sha256: sha256(v2PdfBuffer.toString("hex")),
      status: "CONFIRMED",
      uploadedById: clinicianUser.id,
      pageCount: 1,
    },
  });

  for (let i = 0; i < v2Meds.length; i++) {
    const med = v2Meds[i];
    const line = await prisma.documentLine.create({
      data: {
        documentId: doc2.id,
        page: 1,
        lineIndex: i + 1,
        text: `${i + 1}. ${med.drug} ${med.strength}: ${med.instruction}`,
        x: 0.1,
        y: 0.35 + i * 0.05,
        w: 0.8,
        h: 0.03,
        ocrConfidence: 0.98,
      },
    });

    const entry = await prisma.medicationEntry.create({
      data: {
        visitId: v2.id,
        documentId: doc2.id,
        drugId: drugMap[med.drug],
        drugNameRaw: med.drug,
        strengthRaw: med.strength,
        formRaw: "Tablet",
        instructionRaw: med.instruction,
        confirmed: true,
        confirmedById: clinicianUser.id,
      },
    });

    await prisma.extractedField.create({
      data: {
        entryId: entry.id,
        documentId: doc2.id,
        fieldName: "instruction",
        rawText: med.instruction,
        lineId: line.id,
        page: 1,
        x: line.x,
        y: line.y,
        w: line.w,
        h: line.h,
        confidence: 0.98,
        needsReview: false,
      },
    });
  }

  // Visit 3: Clinic B (visit note) 2026-10-20
  const v3 = await prisma.visit.create({
    data: {
      patientId: patient.id,
      facility: "Clinic B",
      visitType: "Visit Note",
      visitDate: new Date("2026-10-20T11:15:00Z"),
    },
  });

  const v3Meds = [
    { drug: "Metformin", strength: "500 mg", instruction: "1 tablet twice daily" },
    { drug: "Amlodipine", strength: "5 mg", instruction: "1 tablet once daily" },
    { drug: "Atorvastatin", strength: "20 mg", instruction: "1 tablet at night" },
    { drug: "Aspirin", strength: "75 mg", instruction: "" }, // instruction not recorded
  ];

  const v3PdfBuffer = await generateSamplePdf("Clinic B", "Follow-up Clinic Note", "2026-10-20", "Asha R.", "SYN-0042", [
    ...v3Meds.slice(0, 3),
    { drug: "Aspirin", strength: "75 mg", instruction: "(instruction not recorded)" },
  ]);
  const v3DocId = "doc_v3_clinicb";
  const v3Path = path.join(patientFolder, `${v3DocId}.pdf`);
  await fs.writeFile(v3Path, v3PdfBuffer);

  const doc3 = await prisma.sourceDocument.create({
    data: {
      id: v3DocId,
      visitId: v3.id,
      fileName: "ClinicB_Note_20261020.pdf",
      mimeType: "application/pdf",
      storagePath: path.join("./storage", patient.id, `${v3DocId}.pdf`).replace(/\\/g, "/"),
      sha256: sha256(v3PdfBuffer.toString("hex")),
      status: "CONFIRMED",
      uploadedById: clinicianUser.id,
      pageCount: 1,
    },
  });

  for (let i = 0; i < v3Meds.length; i++) {
    const med = v3Meds[i];
    const line = await prisma.documentLine.create({
      data: {
        documentId: doc3.id,
        page: 1,
        lineIndex: i + 1,
        text: `${i + 1}. ${med.drug} ${med.strength}: ${med.instruction || "(instruction not recorded)"}`,
        x: 0.1,
        y: 0.35 + i * 0.05,
        w: 0.8,
        h: 0.03,
        ocrConfidence: 0.98,
      },
    });

    const entry = await prisma.medicationEntry.create({
      data: {
        visitId: v3.id,
        documentId: doc3.id,
        drugId: drugMap[med.drug],
        drugNameRaw: med.drug,
        strengthRaw: med.strength,
        formRaw: "Tablet",
        instructionRaw: med.instruction || null,
        confirmed: true,
        confirmedById: clinicianUser.id,
      },
    });

    await prisma.extractedField.create({
      data: {
        entryId: entry.id,
        documentId: doc3.id,
        fieldName: "instruction",
        rawText: med.instruction,
        lineId: line.id,
        page: 1,
        x: line.x,
        y: line.y,
        w: line.w,
        h: line.h,
        confidence: med.instruction ? 0.98 : 0.40,
        needsReview: !med.instruction,
      },
    });
  }

  console.log("✓ Visits 1, 2, and 3 created and confirmed with sample PDFs");

  // 5. Run Discrepancy Engine directly
  // Import dynamically or execute detection logic
  const { detectDiscrepancies } = await import("../src/lib/discrepancy/engine");
  const detected = await detectDiscrepancies(patient.id, {
    id: clinicianUser.id,
    role: "CLINICIAN",
  });

  console.log(`✓ Discrepancy engine executed: ${detected.length} discrepancies detected.`);
  for (const d of detected) {
    console.log(`  - [${d.severity}] ${d.drugLabel}: ${d.type}`);
  }

  // 6. Write Genesis and seed audit entries
  await writeAudit(
    prisma,
    adminUser.id,
    "ADMIN",
    "patient.created",
    "PATIENT",
    patient.id,
    patient.id,
    { name: patient.name, mrn: patient.mrn }
  );

  console.log("✅ MedBridge seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

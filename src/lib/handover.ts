import crypto from "crypto";
import QRCode from "qrcode";
import { db } from "./db";
import { writeAuditLog } from "./audit";
import { getMedicationPatientStatus } from "./discrepancy/engine";

export async function generateQrCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
    color: {
      dark: "#0F2A24",
      light: "#FFFFFF",
    },
  });
}

export async function createHandoverCard(
  patientId: string,
  createdById: string,
  daysValid = 7
) {
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);

  const card = await db.handoverCard.create({
    data: {
      patientId,
      token,
      expiresAt,
      createdById,
    },
  });

  await writeAuditLog({
    actorId: createdById,
    actorRole: "USER",
    action: "handover.created",
    entityType: "HANDOVER_CARD",
    entityId: card.id,
    patientId,
    payload: {
      cardId: card.id,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return card;
}

export async function revokeHandoverCard(
  cardId: string,
  actorId: string,
  actorRole: string
) {
  const card = await db.handoverCard.findUnique({
    where: { id: cardId },
  });

  if (!card) throw new Error("Handover card not found");

  const updated = await db.handoverCard.update({
    where: { id: cardId },
    data: { revokedAt: new Date() },
  });

  await writeAuditLog({
    actorId,
    actorRole,
    action: "handover.revoked",
    entityType: "HANDOVER_CARD",
    entityId: card.id,
    patientId: card.patientId,
    payload: {
      cardId: card.id,
      revokedAt: updated.revokedAt?.toISOString(),
    },
  });

  return updated;
}

export async function getHandoverCardByToken(token: string) {
  const card = await db.handoverCard.findUnique({
    where: { token },
    include: {
      patient: {
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
      },
    },
  });

  if (!card) return null;
  if (card.revokedAt) return { card, expired: true, revoked: true };
  if (card.expiresAt < new Date()) return { card, expired: true, revoked: false };

  // Increment view count
  await db.handoverCard.update({
    where: { id: card.id },
    data: { viewCount: { increment: 1 } },
  });

  await writeAuditLog({
    actorId: null,
    actorRole: "PUBLIC_GUEST",
    action: "handover.viewed",
    entityType: "HANDOVER_CARD",
    entityId: card.id,
    patientId: card.patientId,
    payload: {
      tokenPrefix: token.substring(0, 6),
      viewCount: card.viewCount + 1,
    },
  });

  // Collect unique drugs
  const allEntries = card.patient.visits.flatMap((v) => v.entries);
  const drugMap = new Map<string, typeof allEntries[0][]>();

  for (const entry of allEntries) {
    const key = entry.drugId ?? entry.drugNameRaw.toLowerCase().trim();
    if (!drugMap.has(key)) drugMap.set(key, []);
    drugMap.get(key)!.push(entry);
  }

  const items = [];
  for (const [, entries] of drugMap.entries()) {
    entries.sort((a: any, b: any) => a.visit.visitDate.getTime() - b.visit.visitDate.getTime());
    const latest = entries[entries.length - 1];
    const drugLabel = latest.drug?.canonicalName ?? latest.drugNameRaw;

    const status = await getMedicationPatientStatus(card.patientId, latest.drugId, drugLabel);

    let displayInstruction = "Pending professional review";
    let isVerified = false;

    if (status.statusText === "Verified") {
      isVerified = true;
      if (status.approvedEntryId) {
        const approved = entries.find((e: any) => e.id === status.approvedEntryId);
        displayInstruction = approved?.instructionRaw || latest.instructionRaw || "As directed";
      } else {
        displayInstruction = latest.instructionRaw || "As directed";
      }
    } else if (status.statusText === "Needs clarification") {
      displayInstruction = "Needs clarification - contact prescribing physician";
    }

    items.push({
      drugName: drugLabel,
      strength: latest.strengthRaw || "Unspecified",
      form: latest.formRaw || "Tablet",
      instruction: displayInstruction,
      status: status.statusText,
      isVerified,
      lastUpdated: latest.visit.visitDate.toISOString().split("T")[0],
      facility: latest.visit.facility,
    });
  }

  return {
    card,
    patient: {
      name: card.patient.name,
      mrn: card.patient.mrn,
      dob: card.patient.dob.toISOString().split("T")[0],
    },
    items,
    expired: false,
    revoked: false,
  };
}

import crypto from "crypto";
import { DiscrepancyType, Severity, ReviewStatus } from "@prisma/client";
import { db } from "../db";
import { writeAuditLog } from "../audit";
import { formatMissingMedicationWarning } from "../safety";

export interface DetectedDiscrepancyItem {
  patientId: string;
  drugId: string | null;
  drugLabel: string;
  type: DiscrepancyType;
  severity: Severity;
  detail: string;
  entryIds: string[];
  fingerprint: string;
  dueAt: Date;
}

export function computeDiscrepancyFingerprint(
  type: DiscrepancyType,
  drugId: string | null,
  drugLabel: string,
  entryIds: string[],
  values: string[]
): string {
  const sortedIds = [...entryIds].sort().join(",");
  const sortedValues = [...values].sort().join("|");
  const raw = `${type}:${drugId ?? drugLabel}:${sortedIds}:${sortedValues}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function calculateDueAt(severity: Severity): Date {
  const now = new Date();
  let hours = 24;
  if (severity === Severity.HIGH) {
    hours = parseInt(process.env.SLA_HOURS_HIGH || "4", 10);
  } else if (severity === Severity.MEDIUM) {
    hours = parseInt(process.env.SLA_HOURS_MEDIUM || "24", 10);
  } else if (severity === Severity.LOW) {
    hours = parseInt(process.env.SLA_HOURS_LOW || "72", 10);
  }
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Runs the deterministic discrepancy detection engine for a specific patient.
 * Uses only confirmed entries, grouped by canonical drug, ordered by visit date.
 */
export async function detectDiscrepancies(
  patientId: string,
  actor?: { id?: string; role?: string }
): Promise<DetectedDiscrepancyItem[]> {
  // 1. Fetch all visits for patient ordered by date
  const visits = await db.visit.findMany({
    where: { patientId },
    orderBy: { visitDate: "asc" },
    include: {
      entries: {
        where: { confirmed: true },
        include: { drug: true, visit: true },
      },
    },
  });

  if (visits.length === 0) return [];

  // Identify all visits that contain confirmed entries
  const visitsWithEntries = visits.filter((v) => v.entries.length > 0);
  if (visitsWithEntries.length === 0) return [];

  const latestVisit = visitsWithEntries[visitsWithEntries.length - 1];

  // Group all confirmed entries by canonical drug id (or normalized drug name if unlinked)
  const drugGroups = new Map<string, { drugId: string | null; drugLabel: string; entries: typeof latestVisit.entries }>();

  for (const v of visitsWithEntries) {
    for (const entry of v.entries) {
      const groupKey = entry.drugId ?? entry.drugNameRaw.toLowerCase().trim();
      const existing = drugGroups.get(groupKey);
      if (existing) {
        existing.entries.push(entry);
      } else {
        drugGroups.set(groupKey, {
          drugId: entry.drugId,
          drugLabel: entry.drug?.canonicalName ?? entry.drugNameRaw,
          entries: [entry],
        });
      }
    }
  }

  const detected: DetectedDiscrepancyItem[] = [];

  for (const [, group] of drugGroups.entries()) {
    // Sort entries chronologically by visitDate
    group.entries.sort((a: any, b: any) => a.visit.visitDate.getTime() - b.visit.visitDate.getTime());
    const entries = group.entries;
    const latestEntry = entries[entries.length - 1];
    const isPresentInLatest = latestEntry.visitId === latestVisit.id;

    // Rule 1: Drug in an earlier visit but absent from the latest visit's list
    if (!isPresentInLatest) {
      // Find the last visit where this drug was listed
      const lastSeenVisit = entries[entries.length - 1].visit;
      // Count visits with entries after that visit
      const laterVisits = visitsWithEntries.filter(
        (v) => v.visitDate.getTime() > lastSeenVisit.visitDate.getTime()
      );
      const absentCount = laterVisits.length;

      const formattedDate = lastSeenVisit.visitDate.toISOString().split("T")[0];
      const detail = formatMissingMedicationWarning(formattedDate, lastSeenVisit.facility, absentCount);

      const fp = computeDiscrepancyFingerprint(
        DiscrepancyType.MISSING_OR_OUTDATED,
        group.drugId,
        group.drugLabel,
        entries.map((e: any) => e.id),
        [detail]
      );

      detected.push({
        patientId,
        drugId: group.drugId,
        drugLabel: group.drugLabel,
        type: DiscrepancyType.MISSING_OR_OUTDATED,
        severity: Severity.HIGH,
        detail,
        entryIds: entries.map((e: any) => e.id),
        fingerprint: fp,
        dueAt: calculateDueAt(Severity.HIGH),
      });
      continue; // Condition 1 evaluated for this drug
    }

    // Rules 2, 3, 4 are mutually exclusive in order
    if (entries.length >= 2) {
      const last = entries[entries.length - 1];
      const prev = entries[entries.length - 2];

      const lastStrength = (last.strengthRaw || "").trim().toLowerCase();
      const prevStrength = (prev.strengthRaw || "").trim().toLowerCase();

      // Rule 2: Strength of the last two entries differs
      if (lastStrength !== prevStrength) {
        const detail = `Conflicting strength between consecutive visits: "${prev.strengthRaw}" (${prev.visit.facility}) vs "${last.strengthRaw}" (${last.visit.facility})`;
        const fp = computeDiscrepancyFingerprint(
          DiscrepancyType.CONFLICTING_STRENGTH,
          group.drugId,
          group.drugLabel,
          [prev.id, last.id],
          [prevStrength, lastStrength]
        );

        detected.push({
          patientId,
          drugId: group.drugId,
          drugLabel: group.drugLabel,
          type: DiscrepancyType.CONFLICTING_STRENGTH,
          severity: Severity.HIGH,
          detail,
          entryIds: [prev.id, last.id],
          fingerprint: fp,
          dueAt: calculateDueAt(Severity.HIGH),
        });
      } else {
        // Last two agree. Did strengths differ earlier?
        const earlierDifferent = entries.slice(0, -2).some((e: any) => {
          return (e.strengthRaw || "").trim().toLowerCase() !== lastStrength;
        });

        if (earlierDifferent) {
          // Rule 3: Strengths differ earlier, but the last two agree
          const detail = `Strength changed across earlier visits, stabilized at "${last.strengthRaw}" in recent visits`;
          const fp = computeDiscrepancyFingerprint(
            DiscrepancyType.STRENGTH_CHANGED,
            group.drugId,
            group.drugLabel,
            entries.map((e: any) => e.id),
            entries.map((e: any) => e.strengthRaw || "")
          );

          detected.push({
            patientId,
            drugId: group.drugId,
            drugLabel: group.drugLabel,
            type: DiscrepancyType.STRENGTH_CHANGED,
            severity: Severity.MEDIUM,
            detail,
            entryIds: entries.map((e: any) => e.id),
            fingerprint: fp,
            dueAt: calculateDueAt(Severity.MEDIUM),
          });
        } else {
          // Strengths all agree across all visits.
          // Rule 4: Strengths all agree, non-empty instruction text differs
          const instructions = entries
            .map((e: any) => (e.instructionRaw || "").trim().toLowerCase())
            .filter((inst: string) => inst.length > 0);

          const hasDifferentInstructions = instructions.length >= 2 && instructions.some((inst: string) => inst !== instructions[0]);

          if (hasDifferentInstructions) {
            const detail = `Instruction wording differs across visits while strength remains ${last.strengthRaw}`;
            const fp = computeDiscrepancyFingerprint(
              DiscrepancyType.INSTRUCTION_DIFFERS,
              group.drugId,
              group.drugLabel,
              entries.map((e: any) => e.id),
              instructions
            );

            detected.push({
              patientId,
              drugId: group.drugId,
              drugLabel: group.drugLabel,
              type: DiscrepancyType.INSTRUCTION_DIFFERS,
              severity: Severity.LOW,
              detail,
              entryIds: entries.map((e: any) => e.id),
              fingerprint: fp,
              dueAt: calculateDueAt(Severity.LOW),
            });
          }
        }
      }
    }

    // Rule 5: Latest entry has an empty instruction (can add to previous rules)
    const latestInstruction = (latestEntry.instructionRaw || "").trim();
    if (!latestInstruction) {
      const detail = `Instruction not recorded for ${group.drugLabel} in latest visit (${latestEntry.visit.facility})`;
      const fp = computeDiscrepancyFingerprint(
        DiscrepancyType.MISSING_INSTRUCTION,
        group.drugId,
        group.drugLabel,
        [latestEntry.id],
        ["EMPTY_INSTRUCTION"]
      );

      detected.push({
        patientId,
        drugId: group.drugId,
        drugLabel: group.drugLabel,
        type: DiscrepancyType.MISSING_INSTRUCTION,
        severity: Severity.MEDIUM,
        detail,
        entryIds: [latestEntry.id],
        fingerprint: fp,
        dueAt: calculateDueAt(Severity.MEDIUM),
      });
    }

    // Rule 6: Another required field is empty or unreadable
    if (!latestEntry.formRaw || !latestEntry.strengthRaw) {
      const missingFields = [
        !latestEntry.formRaw ? "form" : null,
        !latestEntry.strengthRaw ? "strength" : null,
      ]
        .filter(Boolean)
        .join(", ");

      const detail = `Missing required medication field(s): ${missingFields}`;
      const fp = computeDiscrepancyFingerprint(
        DiscrepancyType.MISSING_FIELD,
        group.drugId,
        group.drugLabel,
        [latestEntry.id],
        [missingFields]
      );

      detected.push({
        patientId,
        drugId: group.drugId,
        drugLabel: group.drugLabel,
        type: DiscrepancyType.MISSING_FIELD,
        severity: Severity.MEDIUM,
        detail,
        entryIds: [latestEntry.id],
        fingerprint: fp,
        dueAt: calculateDueAt(Severity.MEDIUM),
      });
    }
  }

  // 2. Synchronize with Database (Dedupe, Reopen, and Supersede)
  const existingDiscrepancies = await db.discrepancy.findMany({
    where: { patientId },
  });

  const detectedFingerprints = new Set(detected.map((d) => d.fingerprint));

  for (const item of detected) {
    const existing = existingDiscrepancies.find((ed) => ed.fingerprint === item.fingerprint);

    if (!existing) {
      // New discrepancy detected!
      const created = await db.discrepancy.create({
        data: {
          patientId: item.patientId,
          drugId: item.drugId,
          drugLabel: item.drugLabel,
          type: item.type,
          severity: item.severity,
          detail: item.detail,
          entryIds: item.entryIds,
          fingerprint: item.fingerprint,
          status: ReviewStatus.PENDING,
          dueAt: item.dueAt,
        },
      });

      await writeAuditLog({
        actorId: actor?.id ?? "system",
        actorRole: actor?.role ?? "SYSTEM",
        action: "discrepancy.created",
        entityType: "DISCREPANCY",
        entityId: created.id,
        patientId,
        payload: {
          drugLabel: item.drugLabel,
          type: item.type,
          severity: item.severity,
          fingerprint: item.fingerprint,
        },
      });
    }
  }

  // If a previously pending condition disappeared, mark superseded
  for (const ed of existingDiscrepancies) {
    if (ed.status === ReviewStatus.PENDING && !detectedFingerprints.has(ed.fingerprint)) {
      await db.discrepancy.update({
        where: { id: ed.id },
        data: {
          status: ReviewStatus.REJECTED, // Or mark superseded
          resolvedAt: new Date(),
        },
      });

      await writeAuditLog({
        actorId: actor?.id ?? "system",
        actorRole: actor?.role ?? "SYSTEM",
        action: "discrepancy.superseded",
        entityType: "DISCREPANCY",
        entityId: ed.id,
        patientId,
        payload: {
          fingerprint: ed.fingerprint,
          reason: "Condition no longer present after record updates",
        },
      });
    }
  }

  return detected;
}

/**
 * Computes patient-facing status for a medication:
 * - "Verified": Every discrepancy in its current set is APPROVED (or it has none).
 * - "Needs clarification": Any discrepancy in its set is REJECTED.
 * - "Pending professional review": Discrepancies exist and at least one is PENDING or ESCALATED.
 */
export async function getMedicationPatientStatus(
  patientId: string,
  drugId: string | null,
  drugLabel: string
): Promise<{
  statusText: "Verified" | "Needs clarification" | "Pending professional review";
  activeDiscrepanciesCount: number;
  approvedEntryId: string | null;
}> {
  const discrepancies = await db.discrepancy.findMany({
    where: {
      patientId,
      OR: [
        { drugId: drugId ?? undefined },
        { drugLabel },
      ],
    },
    include: {
      actions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (discrepancies.length === 0) {
    return { statusText: "Verified", activeDiscrepanciesCount: 0, approvedEntryId: null };
  }

  const anyRejected = discrepancies.some((d) => d.status === ReviewStatus.REJECTED);
  if (anyRejected) {
    return { statusText: "Needs clarification", activeDiscrepanciesCount: discrepancies.length, approvedEntryId: null };
  }

  const allApproved = discrepancies.every((d) => d.status === ReviewStatus.APPROVED);
  if (allApproved) {
    // Find the latest approved entry id
    let latestApprovedEntryId: string | null = null;
    for (const d of discrepancies) {
      for (const act of d.actions) {
        if (act.action === ReviewStatus.APPROVED && act.approvedEntryId) {
          latestApprovedEntryId = act.approvedEntryId;
          break;
        }
      }
      if (latestApprovedEntryId) break;
    }
    return {
      statusText: "Verified",
      activeDiscrepanciesCount: 0,
      approvedEntryId: latestApprovedEntryId,
    };
  }

  return { statusText: "Pending professional review", activeDiscrepanciesCount: discrepancies.length, approvedEntryId: null };
}

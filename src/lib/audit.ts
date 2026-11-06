import crypto from "crypto";
import { db } from "./db";

export type AuditEventAction =
  | "auth.login"
  | "auth.logout"
  | "patient.created"
  | "grant.created"
  | "grant.revoked"
  | "document.uploaded"
  | "document.extracted"
  | "entry.corrected"
  | "document.confirmed"
  | "detection.run"
  | "discrepancy.created"
  | "discrepancy.approved"
  | "discrepancy.rejected"
  | "discrepancy.escalated"
  | "discrepancy.superseded"
  | "handover.created"
  | "handover.viewed"
  | "handover.revoked"
  | "pdf.exported"
  | "settings.changed"
  | "egress.blocked";

export interface AuditLogInput {
  actorId?: string | null;
  actorRole: string;
  action: AuditEventAction;
  entityType: string;
  entityId: string;
  patientId?: string | null;
  payload: Record<string, any>;
}

export function computeSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Computes canonical hash for an audit record given previous hash and row data.
 */
export function computeAuditHash(
  prevHash: string,
  entry: {
    actorId?: string | null;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    patientId?: string | null;
    payload: any;
    ts: string;
  }
): string {
  const canonicalBody = JSON.stringify({
    action: entry.action,
    actorId: entry.actorId ?? null,
    actorRole: entry.actorRole,
    entityId: entry.entityId,
    entityType: entry.entityType,
    patientId: entry.patientId ?? null,
    payload: entry.payload,
    prevHash,
    ts: entry.ts,
  });
  return computeSha256(prevHash + canonicalBody);
}

/**
 * Appends a new tamper-evident audit log row within an existing transaction or standalone.
 */
export async function writeAuditLog(input: AuditLogInput, txClient?: any) {
  const client = txClient || db;
  const execute = async (tx: any) => {
    // Find the last audit log row to retrieve the latest hash
    const lastRow = await tx.auditLog.findFirst({
      orderBy: { seq: "desc" },
      select: { hash: true },
    });

    const prevHash = lastRow?.hash ?? "GENESIS";
    const tsDate = new Date();
    const tsString = tsDate.toISOString();

    const hash = computeAuditHash(prevHash, {
      action: input.action,
      actorId: input.actorId,
      actorRole: input.actorRole,
      entityId: input.entityId,
      entityType: input.entityType,
      patientId: input.patientId,
      payload: input.payload,
      ts: tsString,
    });

    return await tx.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        patientId: input.patientId ?? null,
        payload: input.payload,
        prevHash,
        hash,
        ts: tsDate,
      },
    });
  };

  if (txClient) {
    return execute(txClient);
  } else {
    return client.$transaction(execute);
  }
}

export interface VerificationResult {
  valid: boolean;
  totalVerified: number;
  brokenSeq?: number;
  expectedHash?: string;
  actualHash?: string;
  error?: string;
}

/**
 * Walks every row in the AuditLog by seq, recomputes each hash, and verifies integrity.
 */
export async function verifyAuditChain(): Promise<VerificationResult> {
  const logs = await db.auditLog.findMany({
    orderBy: { seq: "asc" },
  });

  if (logs.length === 0) {
    return { valid: true, totalVerified: 0 };
  }

  let expectedPrevHash = "GENESIS";

  for (const log of logs) {
    if (log.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        totalVerified: Number(log.seq) - 1,
        brokenSeq: Number(log.seq),
        error: `PrevHash mismatch at seq ${log.seq}: expected ${expectedPrevHash}, found ${log.prevHash}`,
      };
    }

    const calculatedHash = computeAuditHash(log.prevHash, {
      action: log.action,
      actorId: log.actorId,
      actorRole: log.actorRole,
      entityId: log.entityId,
      entityType: log.entityType,
      patientId: log.patientId,
      payload: log.payload,
      ts: log.ts.toISOString(),
    });

    if (calculatedHash !== log.hash) {
      return {
        valid: false,
        totalVerified: Number(log.seq) - 1,
        brokenSeq: Number(log.seq),
        expectedHash: calculatedHash,
        actualHash: log.hash,
        error: `Hash mismatch at seq ${log.seq}: tampered data detected`,
      };
    }

    expectedPrevHash = log.hash;
  }

  return {
    valid: true,
    totalVerified: logs.length,
  };
}

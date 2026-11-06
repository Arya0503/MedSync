import { describe, it, expect } from "vitest";
import { computeAuditHash, computeSha256 } from "../../src/lib/audit";

describe("MedBridge Tamper-Evident Audit Chain", () => {
  it("computes deterministic SHA-256 hash for sequential audit logs", () => {
    const prevHash = "GENESIS";
    const entry1 = {
      action: "patient.created",
      actorId: "user_1",
      actorRole: "ADMIN",
      entityId: "pat_1",
      entityType: "PATIENT",
      patientId: "pat_1",
      payload: { name: "Asha R." },
      ts: "2026-11-06T12:00:00.000Z",
    };

    const hash1 = computeAuditHash(prevHash, entry1);
    expect(hash1).toBeDefined();
    expect(hash1.length).toBe(64); // SHA-256 hex string

    // Recomputing with identical parameters yields identical hash
    const recomputed = computeAuditHash(prevHash, entry1);
    expect(recomputed).toBe(hash1);
  });

  it("links consecutive rows via previous hash chaining", () => {
    const genesis = "GENESIS";
    const row1 = {
      action: "patient.created",
      actorId: "admin_1",
      actorRole: "ADMIN",
      entityId: "p1",
      entityType: "PATIENT",
      patientId: "p1",
      payload: { name: "Asha R." },
      ts: "2026-11-06T10:00:00Z",
    };
    const hash1 = computeAuditHash(genesis, row1);

    const row2 = {
      action: "document.uploaded",
      actorId: "clinician_1",
      actorRole: "CLINICIAN",
      entityId: "doc1",
      entityType: "DOCUMENT",
      patientId: "p1",
      payload: { fileName: "note.pdf" },
      ts: "2026-11-06T10:05:00Z",
    };
    const hash2 = computeAuditHash(hash1, row2);
    expect(hash2).not.toBe(hash1);

    const row3 = {
      action: "discrepancy.approved",
      actorId: "pharm_1",
      actorRole: "PHARMACIST",
      entityId: "disc1",
      entityType: "DISCREPANCY",
      patientId: "p1",
      payload: { drugLabel: "Metformin" },
      ts: "2026-11-06T10:15:00Z",
    };
    const hash3 = computeAuditHash(hash2, row3);
    expect(hash3).toBeDefined();
  });

  it("detects tampering when payload or previous hash is altered", () => {
    const genesis = "GENESIS";
    const originalEntry = {
      action: "discrepancy.approved",
      actorId: "pharm_1",
      actorRole: "PHARMACIST",
      entityId: "disc_1",
      entityType: "DISCREPANCY",
      patientId: "pat_1",
      payload: { approvedEntryId: "entry_A", drugLabel: "Metformin" },
      ts: "2026-11-06T10:00:00Z",
    };

    const originalHash = computeAuditHash(genesis, originalEntry);

    // Tamper with payload (e.g. changing approvedEntryId)
    const tamperedEntry = {
      ...originalEntry,
      payload: { approvedEntryId: "entry_MALICIOUS", drugLabel: "Metformin" },
    };

    const tamperedHash = computeAuditHash(genesis, tamperedEntry);
    expect(tamperedHash).not.toBe(originalHash);

    // Tamper with prevHash
    const brokenChainHash = computeAuditHash("FORGED_PREV_HASH", originalEntry);
    expect(brokenChainHash).not.toBe(originalHash);
  });
});

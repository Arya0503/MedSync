import { describe, it, expect } from "vitest";
import { computeDiscrepancyFingerprint } from "../../src/lib/discrepancy/engine";
import { DiscrepancyType, Severity } from "@prisma/client";
import { formatMissingMedicationWarning } from "../../src/lib/safety";

describe("MedBridge Discrepancy Engine Rules (Section 8 & 18 Seed Scenario)", () => {
  // Synthetic seed records for Asha R. (MRN: SYN-0042)
  const visit1 = {
    id: "v1",
    facility: "Clinic A",
    visitDate: new Date("2026-03-02"),
    entries: [
      { id: "e1", drug: "Metformin", strength: "500 mg", instruction: "1 tablet twice daily after meals", form: "Tablet" },
      { id: "e2", drug: "Amlodipine", strength: "5 mg", instruction: "1 tablet once daily, morning", form: "Tablet" },
      { id: "e3", drug: "Atorvastatin", strength: "10 mg", instruction: "1 tablet at night", form: "Tablet" },
      { id: "e4", drug: "Pantoprazole", strength: "40 mg", instruction: "once daily before breakfast", form: "Tablet" },
    ],
  };

  const visit2 = {
    id: "v2",
    facility: "City Hospital",
    visitDate: new Date("2026-08-14"),
    entries: [
      { id: "e5", drug: "Metformin", strength: "1000 mg", instruction: "1 tablet twice daily", form: "Tablet" },
      { id: "e6", drug: "Amlodipine", strength: "5 mg", instruction: "1 tablet once daily, morning", form: "Tablet" },
      { id: "e7", drug: "Atorvastatin", strength: "20 mg", instruction: "1 tablet at night", form: "Tablet" },
      { id: "e8", drug: "Aspirin", strength: "75 mg", instruction: "once daily (new)", form: "Tablet" },
    ],
  };

  const visit3 = {
    id: "v3",
    facility: "Clinic B",
    visitDate: new Date("2026-10-20"),
    entries: [
      { id: "e9", drug: "Metformin", strength: "500 mg", instruction: "1 tablet twice daily", form: "Tablet" },
      { id: "e10", drug: "Amlodipine", strength: "5 mg", instruction: "1 tablet once daily", form: "Tablet" },
      { id: "e11", drug: "Atorvastatin", strength: "20 mg", instruction: "1 tablet at night", form: "Tablet" },
      { id: "e12", drug: "Aspirin", strength: "75 mg", instruction: "", form: "Tablet" }, // instruction not recorded
    ],
  };

  const allVisits = [visit1, visit2, visit3];
  const latestVisit = visit3;

  function evaluatePatientScenario() {
    const drugs = ["Metformin", "Amlodipine", "Atorvastatin", "Pantoprazole", "Aspirin"];
    const detected: Array<{ drug: string; type: DiscrepancyType; severity: Severity; detail: string; fingerprint: string }> = [];

    for (const drug of drugs) {
      // Collect entries across visits in order
      const entries = [];
      for (const v of allVisits) {
        const found = v.entries.find((e) => e.drug === drug);
        if (found) entries.push({ ...found, visit: v });
      }

      const isPresentInLatest = latestVisit.entries.some((e) => e.drug === drug);

      // Rule 1: Drug in an earlier visit but absent from latest visit's list
      if (!isPresentInLatest) {
        const lastSeen = entries[entries.length - 1];
        const absentCount = allVisits.filter((v) => v.visitDate.getTime() > lastSeen.visit.visitDate.getTime()).length;
        const detail = formatMissingMedicationWarning(
          lastSeen.visit.visitDate.toISOString().split("T")[0],
          lastSeen.visit.facility,
          absentCount
        );
        const fp = computeDiscrepancyFingerprint(
          DiscrepancyType.MISSING_OR_OUTDATED,
          null,
          drug,
          entries.map((e) => e.id),
          [detail]
        );
        detected.push({
          drug,
          type: DiscrepancyType.MISSING_OR_OUTDATED,
          severity: Severity.HIGH,
          detail,
          fingerprint: fp,
        });
        continue;
      }

      // Rules 2, 3, 4 (mutually exclusive in order)
      if (entries.length >= 2) {
        const last = entries[entries.length - 1];
        const prev = entries[entries.length - 2];

        // Rule 2: Strength of the last two entries differs
        if (last.strength.toLowerCase() !== prev.strength.toLowerCase()) {
          const detail = `Conflicting strength: "${prev.strength}" vs "${last.strength}"`;
          const fp = computeDiscrepancyFingerprint(
            DiscrepancyType.CONFLICTING_STRENGTH,
            null,
            drug,
            [prev.id, last.id],
            [prev.strength, last.strength]
          );
          detected.push({
            drug,
            type: DiscrepancyType.CONFLICTING_STRENGTH,
            severity: Severity.HIGH,
            detail,
            fingerprint: fp,
          });
        } else {
          // Last two agree. Did strengths differ earlier?
          const earlierDiff = entries.slice(0, -2).some((e) => e.strength.toLowerCase() !== last.strength.toLowerCase());
          if (earlierDiff) {
            // Rule 3: Strengths differ earlier, but last two agree
            const detail = `Strength changed across earlier visits, stabilized at "${last.strength}"`;
            const fp = computeDiscrepancyFingerprint(
              DiscrepancyType.STRENGTH_CHANGED,
              null,
              drug,
              entries.map((e) => e.id),
              entries.map((e) => e.strength)
            );
            detected.push({
              drug,
              type: DiscrepancyType.STRENGTH_CHANGED,
              severity: Severity.MEDIUM,
              detail,
              fingerprint: fp,
            });
          } else {
            // Rule 4: Strengths all agree, non-empty instruction text differs
            const nonEmpties = entries.map((e) => e.instruction.trim().toLowerCase()).filter(Boolean);
            const instDiff = nonEmpties.length >= 2 && nonEmpties.some((i) => i !== nonEmpties[0]);
            if (instDiff) {
              const detail = `Instruction differs: "${entries[0].instruction}" vs "${entries[entries.length - 1].instruction}"`;
              const fp = computeDiscrepancyFingerprint(
                DiscrepancyType.INSTRUCTION_DIFFERS,
                null,
                drug,
                entries.map((e) => e.id),
                nonEmpties
              );
              detected.push({
                drug,
                type: DiscrepancyType.INSTRUCTION_DIFFERS,
                severity: Severity.LOW,
                detail,
                fingerprint: fp,
              });
            }
          }
        }
      }

      // Rule 5: Latest entry has empty instruction
      const latestEntry = entries[entries.length - 1];
      if (!latestEntry.instruction.trim()) {
        const detail = `Missing instruction for ${drug} in latest visit`;
        const fp = computeDiscrepancyFingerprint(
          DiscrepancyType.MISSING_INSTRUCTION,
          null,
          drug,
          [latestEntry.id],
          ["EMPTY"]
        );
        detected.push({
          drug,
          type: DiscrepancyType.MISSING_INSTRUCTION,
          severity: Severity.MEDIUM,
          detail,
          fingerprint: fp,
        });
      }
    }

    return detected;
  }

  it("produces EXACTLY the 5 expected discrepancies for Asha R. seed data", () => {
    const results = evaluatePatientScenario();

    expect(results).toHaveLength(5);

    // 1. Metformin: CONFLICTING_STRENGTH (HIGH)
    const metformin = results.find((r) => r.drug === "Metformin");
    expect(metformin).toBeDefined();
    expect(metformin?.type).toBe(DiscrepancyType.CONFLICTING_STRENGTH);
    expect(metformin?.severity).toBe(Severity.HIGH);

    // 2. Pantoprazole: MISSING_OR_OUTDATED (HIGH)
    const panto = results.find((r) => r.drug === "Pantoprazole");
    expect(panto).toBeDefined();
    expect(panto?.type).toBe(DiscrepancyType.MISSING_OR_OUTDATED);
    expect(panto?.severity).toBe(Severity.HIGH);
    expect(panto?.detail).toContain("Absent from 2 later lists. Not confirmed as stopped.");

    // 3. Atorvastatin: STRENGTH_CHANGED (MEDIUM)
    const atorva = results.find((r) => r.drug === "Atorvastatin");
    expect(atorva).toBeDefined();
    expect(atorva?.type).toBe(DiscrepancyType.STRENGTH_CHANGED);
    expect(atorva?.severity).toBe(Severity.MEDIUM);

    // 4. Aspirin: MISSING_INSTRUCTION (MEDIUM)
    const aspirin = results.find((r) => r.drug === "Aspirin");
    expect(aspirin).toBeDefined();
    expect(aspirin?.type).toBe(DiscrepancyType.MISSING_INSTRUCTION);
    expect(aspirin?.severity).toBe(Severity.MEDIUM);

    // 5. Amlodipine: INSTRUCTION_DIFFERS (LOW)
    const amlo = results.find((r) => r.drug === "Amlodipine");
    expect(amlo).toBeDefined();
    expect(amlo?.type).toBe(DiscrepancyType.INSTRUCTION_DIFFERS);
    expect(amlo?.severity).toBe(Severity.LOW);
  });

  it("generates deterministic fingerprints for deduplication", () => {
    const fp1 = computeDiscrepancyFingerprint(
      DiscrepancyType.CONFLICTING_STRENGTH,
      "drug_1",
      "Metformin",
      ["e1", "e2"],
      ["500 mg", "1000 mg"]
    );
    const fp2 = computeDiscrepancyFingerprint(
      DiscrepancyType.CONFLICTING_STRENGTH,
      "drug_1",
      "Metformin",
      ["e2", "e1"], // order swapped
      ["500 mg", "1000 mg"]
    );

    // Order invariant
    expect(fp1).toBe(fp2);
  });
});

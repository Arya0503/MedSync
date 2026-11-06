import { describe, it, expect } from "vitest";
import { parseMedicationLine } from "../../src/lib/extraction/parser";
import { normalizeDrugName, levenshteinDistance } from "../../src/lib/normalize";

describe("MedBridge Deterministic Rule-Based Parser", () => {
  it("accurately extracts form, drug, strength, and instruction from prescription line", () => {
    const line = "Tab Metformin 500 mg: 1 tablet twice daily after meals";
    const result = parseMedicationLine(line);

    expect(result).not.toBeNull();
    expect(result?.drugNameRaw).toBe("Metformin");
    expect(result?.strengthRaw).toBe("500 mg");
    expect(result?.strengthValue).toBe(500);
    expect(result?.strengthUnit).toBe("mg");
    expect(result?.instructionRaw).toBe("1 tablet twice daily after meals");
    expect(result?.formRaw).toBe("Tab");
    expect(result?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("handles numbered lists and separators cleanly", () => {
    const line1 = "1. Amlodipine 5 mg, 1 tablet once daily, morning";
    const res1 = parseMedicationLine(line1);
    expect(res1?.drugNameRaw).toBe("Amlodipine");
    expect(res1?.strengthRaw).toBe("5 mg");
    expect(res1?.instructionRaw).toBe("1 tablet once daily, morning");

    const line2 = "Rx: Atorvastatin 20 mg - 1 tablet at night.";
    const res2 = parseMedicationLine(line2);
    expect(res2?.drugNameRaw).toBe("Atorvastatin");
    expect(res2?.strengthRaw).toBe("20 mg");
    expect(res2?.instructionRaw).toBe("1 tablet at night");
  });

  it("extracts medication when instruction is missing or not recorded with lower confidence", () => {
    const line = "Aspirin 75 mg";
    const result = parseMedicationLine(line);

    expect(result).not.toBeNull();
    expect(result?.drugNameRaw).toBe("Aspirin");
    expect(result?.strengthRaw).toBe("75 mg");
    expect(result?.instructionRaw).toBeNull();
    // Incomplete instruction results in confidence below 0.80 triggering Needs Review
    expect(result?.confidence).toBeLessThan(0.80);
  });

  it("computes Levenshtein edit distance accurately for fuzzy alias matching", () => {
    expect(levenshteinDistance("Metformin", "Metformin")).toBe(0);
    expect(levenshteinDistance("Metformin", "Metfomin")).toBe(1); // 1 deletion
    expect(levenshteinDistance("Amlodipine", "Amlodipin")).toBe(1);
    expect(levenshteinDistance("Atorvastatin", "Atorvastatn")).toBe(1);
    expect(levenshteinDistance("Aspirin", "Asprin")).toBe(1);
    expect(levenshteinDistance("Disprin", "Disprn")).toBe(1);
  });
});

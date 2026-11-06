import { assertNoClinicalAdvice } from "../safety";
import { parseStrength } from "../normalize";

export interface ParsedMedicationLine {
  formRaw: string | null;
  drugNameRaw: string;
  strengthRaw: string | null;
  strengthValue: number | null;
  strengthUnit: string | null;
  instructionRaw: string | null;
  confidence: number;
}

/**
 * Deterministic rule-based parser for medical prescription and visit note lines.
 * Handles common medical notations:
 * - "Tab Metformin 500 mg: 1 tablet twice daily after meals"
 * - "Cap. Amlodipine 5mg - 1 tab once daily in morning"
 * - "Atorvastatin 20 mg 1 tablet at night"
 * - "1. Metformin 1000 mg, 1 tablet twice daily"
 * - "Rx: Aspirin 75 mg once daily"
 */
export function parseMedicationLine(lineText: string, ocrConfidence = 0.95): ParsedMedicationLine | null {
  const trimmed = lineText.trim();
  if (!trimmed || trimmed.length < 3) return null;

  // Strip leading list numbers, bullets, or "Rx:"
  const cleaned = trimmed
    .replace(/^(\d+[\.\)]\s*|[-*•]\s*|rx:\s*|r\/x\s*)/i, "")
    .trim();

  // Pattern: (Form)? (DrugName) (Strength) (Separator)? (Instruction)?
  // e.g., Tab Metformin 500 mg, 1 tablet twice daily
  const mainRegex = /^(Tab(?:let)?|Cap(?:sule)?|Syp|Syrup|Inj(?:ection)?|Oint(?:ment)?|Drop[s]?|Susp(?:ension)?)?\.?\s*([A-Za-z][A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+)?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units?))\b(?:\s*[:\-,\/]\s*|\s+)(.*)$/i;

  const match = cleaned.match(mainRegex);

  if (match) {
    const formRaw = match[1] ? match[1].trim() : "Tablet";
    const drugNameRaw = match[2].trim();
    const strengthRaw = match[3].trim();
    let instructionRaw = match[4] ? match[4].trim() : null;

    // Remove any trailing punctuation
    if (instructionRaw) {
      instructionRaw = instructionRaw.replace(/[;,\.]+$/, "").trim();
    }

    // Safety guardrail: ensure no clinical advice is generated
    assertNoClinicalAdvice(instructionRaw);

    const { strengthValue, strengthUnit } = parseStrength(strengthRaw);

    // Calculate confidence: base OCR confidence * pattern completeness
    let patternConfidence = 0.90;
    if (formRaw) patternConfidence += 0.05;
    if (instructionRaw && instructionRaw.length > 5) patternConfidence += 0.05;
    const finalConfidence = Math.min(1.0, Math.max(0.1, Number((ocrConfidence * patternConfidence).toFixed(2))));

    return {
      formRaw,
      drugNameRaw,
      strengthRaw,
      strengthValue,
      strengthUnit,
      instructionRaw: instructionRaw || null,
      confidence: finalConfidence,
    };
  }

  // Fallback pattern: DrugName followed immediately by strength, no explicit instruction
  // e.g. "Aspirin 75 mg"
  const fallbackRegex = /^(Tab(?:let)?|Cap(?:sule)?)?\.?\s*([A-Za-z][A-Za-z0-9\-]+)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu))\b\s*(.*)$/i;
  const fallbackMatch = cleaned.match(fallbackRegex);

  if (fallbackMatch) {
    const formRaw = fallbackMatch[1] ? fallbackMatch[1].trim() : null;
    const drugNameRaw = fallbackMatch[2].trim();
    const strengthRaw = fallbackMatch[3].trim();
    const instructionRaw = fallbackMatch[4] ? fallbackMatch[4].trim() : null;

    assertNoClinicalAdvice(instructionRaw);
    const { strengthValue, strengthUnit } = parseStrength(strengthRaw);

    // Lower confidence since instruction was incomplete or missing
    const confidence = Math.min(0.79, Number((ocrConfidence * 0.75).toFixed(2))); // Below 0.80 triggers review

    return {
      formRaw,
      drugNameRaw,
      strengthRaw,
      strengthValue,
      strengthUnit,
      instructionRaw: instructionRaw || null,
      confidence,
    };
  }

  return null;
}

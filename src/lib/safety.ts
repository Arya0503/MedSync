/**
 * MedBridge Safety Boundary & Clinical Guardrails
 * 
 * In accordance with Problem Statement 4 and Section 2 & 19 of the master specification:
 * - Synthetic data only.
 * - MedBridge NEVER prescribes, substitutes medicines, recommends dose changes,
 *   or tells anyone to stop or start a medication.
 * - The system only records, compares, flags and routes. Clinical decisions remain with qualified professionals.
 */

export const FORBIDDEN_CLINICAL_ADVICE_PHRASES = [
  "increase the dose",
  "decrease the dose",
  "increase dose",
  "decrease dose",
  "reduce the dose",
  "reduce dose",
  "switch to",
  "replace with",
  "substitute",
  "stop taking",
  "start taking",
  "recommended dose",
  "you should take",
  "you must take",
  "we recommend taking",
  "drug interaction detected",
  "contraindicated with",
  "discontinue",
  "titrate up",
  "titrate down",
];

export class SafetyViolationError extends Error {
  constructor(phrase: string, text: string) {
    super(`Safety Violation: Prohibited clinical advice phrase detected: "${phrase}". Found in text: "${text.substring(0, 100)}..."`);
    this.name = "SafetyViolationError";
  }
}

/**
 * Asserts that the provided text does not contain prescriptive or diagnostic advice.
 * Throws a SafetyViolationError if any forbidden phrase is found.
 */
export function assertNoClinicalAdvice(text: string | null | undefined): void {
  if (!text) return;
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_CLINICAL_ADVICE_PHRASES) {
    if (lower.includes(phrase)) {
      throw new SafetyViolationError(phrase, text);
    }
  }
}

/**
 * Formats a missing medication warning according to Rule 1:
 * "Last listed on <date> (<facility>). Absent from N later lists. Not confirmed as stopped."
 * Never claim a medication was stopped.
 */
export function formatMissingMedicationWarning(
  lastDateFormatted: string,
  lastFacility: string,
  absentCount: number
): string {
  return `Last listed on ${lastDateFormatted} (${lastFacility}). Absent from ${absentCount} later list${absentCount === 1 ? "" : "s"}. Not confirmed as stopped.`;
}

export const PERSISTENT_SAFETY_NOTICE =
  "Synthetic data only. MedBridge never prescribes, substitutes medicines, recommends dose changes or tells anyone to stop medication. Decisions stay with qualified healthcare professionals. Records never leave this server.";

import { describe, it, expect } from "vitest";
import {
  assertNoClinicalAdvice,
  SafetyViolationError,
  formatMissingMedicationWarning,
  PERSISTENT_SAFETY_NOTICE,
} from "../../src/lib/safety";

describe("MedBridge Safety Boundary & Clinical Guardrails", () => {
  it("allows safe descriptive instructions verbatim from prescription", () => {
    expect(() => assertNoClinicalAdvice("1 tablet twice daily after meals")).not.toThrow();
    expect(() => assertNoClinicalAdvice("Take once daily in morning with water")).not.toThrow();
    expect(() => assertNoClinicalAdvice(null)).not.toThrow();
    expect(() => assertNoClinicalAdvice(undefined)).not.toThrow();
  });

  it("strictly throws SafetyViolationError on prescriptive advice to increase or decrease dose", () => {
    expect(() => assertNoClinicalAdvice("increase the dose to 1000 mg")).toThrow(SafetyViolationError);
    expect(() => assertNoClinicalAdvice("Patient should reduce the dose")).toThrow(SafetyViolationError);
    expect(() => assertNoClinicalAdvice("Titrate up weekly")).toThrow(SafetyViolationError);
  });

  it("strictly throws SafetyViolationError on drug substitution or stop/start commands", () => {
    expect(() => assertNoClinicalAdvice("switch to generic metformin")).toThrow(SafetyViolationError);
    expect(() => assertNoClinicalAdvice("replace with amlodipine")).toThrow(SafetyViolationError);
    expect(() => assertNoClinicalAdvice("stop taking pantoprazole immediately")).toThrow(SafetyViolationError);
    expect(() => assertNoClinicalAdvice("start taking aspirin")).toThrow(SafetyViolationError);
  });

  it("strictly throws SafetyViolationError on interaction claims", () => {
    expect(() => assertNoClinicalAdvice("Drug interaction detected with warfarin")).toThrow(SafetyViolationError);
    expect(() => assertNoClinicalAdvice("Contraindicated with alcohol")).toThrow(SafetyViolationError);
  });

  it("formats missing medication warning conforming exactly to Rule 1 without claiming medicine was stopped", () => {
    const warning = formatMissingMedicationWarning("2026-03-02", "Clinic A", 2);
    expect(warning).toBe(
      "Last listed on 2026-03-02 (Clinic A). Absent from 2 later lists. Not confirmed as stopped."
    );
    expect(warning.toLowerCase()).not.toContain("stopped taking");
    expect(warning.toLowerCase()).not.toContain("discontinued by patient");
  });

  it("provides persistent safety notice text", () => {
    expect(PERSISTENT_SAFETY_NOTICE).toContain("Synthetic data only");
    expect(PERSISTENT_SAFETY_NOTICE).toContain("MedBridge never prescribes");
    expect(PERSISTENT_SAFETY_NOTICE).toContain("Records never leave this server");
  });
});

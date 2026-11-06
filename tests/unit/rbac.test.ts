import { describe, it, expect } from "vitest";
import { assertRole, assertCanApproveDiscrepancy, ForbiddenError } from "../../src/lib/rbac";
import { Role } from "@prisma/client";

describe("MedBridge Roles & RBAC Isolation", () => {
  it("enforces role permissions correctly", () => {
    const clinician = {
      id: "c1",
      email: "clinician@demo.test",
      name: "Dr. Mehta",
      role: Role.CLINICIAN,
      patientId: null,
    };

    expect(() => assertRole(clinician, [Role.CLINICIAN, Role.ADMIN])).not.toThrow();
    expect(() => assertRole(clinician, [Role.PATIENT])).toThrow(ForbiddenError);
  });

  it("permits only Pharmacists to approve discrepancies", () => {
    const pharmacist = {
      id: "p1",
      email: "pharmacist@demo.test",
      name: "Priya S.",
      role: Role.PHARMACIST,
      patientId: null,
    };

    const clinician = {
      id: "c1",
      email: "clinician@demo.test",
      name: "Dr. Mehta",
      role: Role.CLINICIAN,
      patientId: null,
    };

    const patient = {
      id: "pt1",
      email: "patient@demo.test",
      name: "Asha R.",
      role: Role.PATIENT,
      patientId: "patient_asha",
    };

    expect(() => assertCanApproveDiscrepancy(pharmacist)).not.toThrow();
    expect(() => assertCanApproveDiscrepancy(clinician)).toThrow(ForbiddenError);
    expect(() => assertCanApproveDiscrepancy(patient)).toThrow(ForbiddenError);
  });
});

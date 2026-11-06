import { Role } from "@prisma/client";
import { SessionUser } from "./auth";
import { db } from "./db";

export class ForbiddenError extends Error {
  constructor(message = "Access denied: insufficient permissions or missing active access grant") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required. Please sign in.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function assertAuthenticated(user: SessionUser | null): asserts user is SessionUser {
  if (!user) {
    throw new UnauthorizedError();
  }
}

export function assertRole(user: SessionUser | null, allowedRoles: Role[]): asserts user is SessionUser {
  assertAuthenticated(user);
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(`Role ${user.role} is not permitted to perform this action.`);
  }
}

/**
 * Server-side check: A professional opens a patient only with an active AccessGrant.
 * A patient opens only their own record.
 * Admin has administrative oversight.
 */
export async function assertPatientAccess(user: SessionUser | null, patientId: string): Promise<void> {
  assertAuthenticated(user);

  // Admin access
  if (user.role === Role.ADMIN) {
    return;
  }

  // Patient access: only their own record
  if (user.role === Role.PATIENT) {
    if (!user.patientId || user.patientId !== patientId) {
      throw new ForbiddenError("Patients are only permitted to access their own records.");
    }
    return;
  }

  // Clinician & Pharmacist: must possess an active, non-revoked AccessGrant
  if (user.role === Role.CLINICIAN || user.role === Role.PHARMACIST) {
    const activeGrant = await db.accessGrant.findFirst({
      where: {
        patientId,
        userId: user.id,
        revokedAt: null,
      },
    });

    if (!activeGrant) {
      throw new ForbiddenError("No active access grant exists for this patient record.");
    }
    return;
  }

  throw new ForbiddenError("Access denied.");
}

/**
 * Discrepancy approval rule (Section 4 & 6):
 * Clinicians can escalate or reject; only Pharmacists (or Admins for maintenance) can approve discrepancies.
 */
export function assertCanApproveDiscrepancy(user: SessionUser): void {
  if (user.role !== Role.PHARMACIST && user.role !== Role.ADMIN) {
    throw new ForbiddenError("Only a licensed Pharmacist can approve discrepancy resolution.");
  }
}

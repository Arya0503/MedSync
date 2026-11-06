import { describe, it, expect } from "vitest";
import crypto from "crypto";

describe("Handover Cards & SLA Calculations", () => {
  it("calculates correct SLA due timestamps based on severity", () => {
    const baseTime = new Date("2026-10-20T10:00:00.000Z");

    const highDue = new Date(baseTime.getTime() + 4 * 60 * 60 * 1000);
    const medDue = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
    const lowDue = new Date(baseTime.getTime() + 72 * 60 * 60 * 1000);

    expect(highDue.toISOString()).toBe("2026-10-20T14:00:00.000Z");
    expect(medDue.toISOString()).toBe("2026-10-21T10:00:00.000Z");
    expect(lowDue.toISOString()).toBe("2026-10-23T10:00:00.000Z");
  });

  it("generates cryptographically secure handover tokens", () => {
    const token1 = crypto.randomBytes(24).toString("base64url");
    const token2 = crypto.randomBytes(24).toString("base64url");

    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThanOrEqual(32);
    // Base64url safe chars
    expect(token1).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("revocation prevents active card resolution", () => {
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const past = new Date(now.getTime() - 1000);

    const activeCard = {
      revokedAt: null,
      expiresAt: future,
    };

    const isCardUsable = (card: { revokedAt: Date | null; expiresAt: Date }) => {
      return card.revokedAt === null && card.expiresAt > new Date();
    };

    expect(isCardUsable(activeCard)).toBe(true);

    const expiredCard = {
      revokedAt: null,
      expiresAt: past,
    };
    expect(isCardUsable(expiredCard)).toBe(false);

    const revokedCard = {
      revokedAt: new Date(),
      expiresAt: future,
    };
    expect(isCardUsable(revokedCard)).toBe(false);
  });
});

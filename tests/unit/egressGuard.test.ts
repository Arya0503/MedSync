import { describe, it, expect } from "vitest";
import { isHostAllowed, safeFetch, EgressBlockedError } from "../../src/lib/egressGuard";
import fs from "fs";
import path from "path";

describe("MedBridge Constraint 7: Privacy and Local-Only Processing", () => {
  it("allows only approved internal network hosts", () => {
    expect(isHostAllowed("localhost")).toBe(true);
    expect(isHostAllowed("127.0.0.1")).toBe(true);
    expect(isHostAllowed("db")).toBe(true);
    expect(isHostAllowed("ollama")).toBe(true);
    expect(isHostAllowed("localhost:3000")).toBe(true);
  });

  it("strictly blocks external hosts, CDNs, and cloud AI APIs", () => {
    expect(isHostAllowed("api.openai.com")).toBe(false);
    expect(isHostAllowed("api.anthropic.com")).toBe(false);
    expect(isHostAllowed("googleapis.com")).toBe(false);
    expect(isHostAllowed("fonts.googleapis.com")).toBe(false);
    expect(isHostAllowed("cdnjs.cloudflare.com")).toBe(false);
    expect(isHostAllowed("example.com")).toBe(false);
  });

  it("throws EgressBlockedError when safeFetch attempts an external network call", async () => {
    await expect(safeFetch("https://api.openai.com/v1/chat/completions")).rejects.toThrow(
      EgressBlockedError
    );
    await expect(safeFetch("https://example.com/test")).rejects.toThrow(
      EgressBlockedError
    );
  });

  it("verifies package.json contains ZERO cloud AI SDKs or cloud analytics", () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")
    );
    const allDeps = {
      ...pkgJson.dependencies,
      ...pkgJson.devDependencies,
    };

    const forbiddenPackages = [
      "openai",
      "@anthropic-ai/sdk",
      "@google/generative-ai",
      "@google-cloud/vision",
      "aws-sdk",
      "@aws-sdk",
      "@azure/cognitiveservices-computervision",
      "@sentry/nextjs",
      "@vercel/analytics",
      "google-analytics",
    ];

    for (const pkg of forbiddenPackages) {
      expect(allDeps[pkg]).toBeUndefined();
    }
  });
});

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { isHostAllowed } from "@/lib/egressGuard";

describe("Constraint 7: Zero External Network Requests & Offline Privacy", () => {
  it("strictly forbids external cloud AI and third-party SDKs in package.json", () => {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    const forbiddenPackages = [
      "openai",
      "@google/generative-ai",
      "@anthropic-ai/sdk",
      "aws-sdk",
      "@aws-sdk",
      "azure",
      "@azure",
      "firebase",
      "mixpanel",
      "google-analytics",
      "@sentry/nextjs",
    ];

    for (const dep of Object.keys(allDeps)) {
      for (const forbidden of forbiddenPackages) {
        expect(dep.toLowerCase()).not.toContain(forbidden);
      }
    }
  });

  it("enforces strict CSP configuration with connect-src 'self'", () => {
    const nextConfigPath = path.resolve(process.cwd(), "next.config.mjs");
    const configContent = fs.readFileSync(nextConfigPath, "utf-8");

    expect(configContent).toContain("Content-Security-Policy");
    expect(configContent).toContain("default-src 'self'");
    expect(configContent).toContain("connect-src 'self'");
    expect(configContent).toContain("frame-ancestors 'none'");
  });

  it("egress guard strictly rejects external IPs and domains", () => {
    expect(isHostAllowed("localhost")).toBe(true);
    expect(isHostAllowed("127.0.0.1")).toBe(true);
    expect(isHostAllowed("db")).toBe(true);
    expect(isHostAllowed("ollama")).toBe(true);

    expect(isHostAllowed("api.openai.com")).toBe(false);
    expect(isHostAllowed("generativelanguage.googleapis.com")).toBe(false);
    expect(isHostAllowed("fonts.googleapis.com")).toBe(false);
    expect(isHostAllowed("cdn.jsdelivr.net")).toBe(false);
    expect(isHostAllowed("8.8.8.8")).toBe(false);
  });
});

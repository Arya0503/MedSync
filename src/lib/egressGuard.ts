import { db } from "./db";
import { writeAuditLog } from "./audit";

/**
 * MedBridge Constraint 7: Privacy and Local-Only Processing Egress Guard
 * 
 * Specified personal or sensitive records cannot be transmitted to external services
 * or processed by a cloud-hosted AI service.
 * All outgoing network calls must pass through safeFetch.
 */

export class EgressBlockedError extends Error {
  public host: string;
  constructor(host: string, url: string) {
    super(`Constraint 7 Violation: Outbound network request to host "${host}" blocked by MedBridge Egress Guard. Target: ${url}`);
    this.name = "EgressBlockedError";
    this.host = host;
  }
}

export function getAllowedInternalHosts(): string[] {
  const envVal = process.env.ALLOWED_INTERNAL_HOSTS || "localhost,127.0.0.1,db,ollama";
  return envVal
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function isHostAllowed(host: string): boolean {
  const normalizedHost = host.toLowerCase().split(":")[0];
  const allowed = getAllowedInternalHosts();
  return allowed.includes(normalizedHost);
}

/**
 * safeFetch: The only sanctioned mechanism for outbound HTTP requests in MedBridge.
 * Throws and audits any request to hosts not on the ALLOWED_INTERNAL_HOSTS allowlist.
 */
export async function safeFetch(
  input: string | URL,
  init?: RequestInit,
  context?: { actorId?: string; actorRole?: string; patientId?: string }
): Promise<Response> {
  const urlString = typeof input === "string" ? input : input.toString();
  let url: URL;
  try {
    url = new URL(urlString);
  } catch (err) {
    throw new Error(`Invalid URL passed to safeFetch: ${urlString}`);
  }

  const host = url.hostname.toLowerCase();

  if (!isHostAllowed(host)) {
    // Log egress event to database
    try {
      await db.egressEvent.create({
        data: {
          host,
          blocked: true,
          source: urlString,
        },
      });

      await writeAuditLog({
        actorId: context?.actorId ?? "system",
        actorRole: context?.actorRole ?? "SYSTEM",
        action: "egress.blocked",
        entityType: "NETWORK_REQUEST",
        entityId: host,
        patientId: context?.patientId,
        payload: {
          blockedHost: host,
          targetUrl: urlString,
          timestamp: new Date().toISOString(),
          reason: "Violates Constraint 7 - local only processing",
        },
      });
    } catch (auditErr) {
      // Ignore DB connection errors during standalone unit tests without active DB
    }

    throw new EgressBlockedError(host, urlString);
  }

  // Allowed internal host
  return fetch(input, init);
}

export async function getEgressStatus() {
  const allowedHosts = getAllowedInternalHosts();
  let blockedCount = 0;
  let totalEvents = 0;
  let recentEvents: any[] = [];

  try {
    blockedCount = await db.egressEvent.count({ where: { blocked: true } });
    totalEvents = await db.egressEvent.count();
    recentEvents = await db.egressEvent.findMany({
      orderBy: { ts: "desc" },
      take: 20,
    });
  } catch (err) {
    // If DB is initializing, return default 0
  }

  return {
    egressGuardActive: true,
    allowedHosts,
    blockedAttemptsCount: blockedCount,
    totalOutboundLogged: totalEvents,
    recentEvents,
    storageLocation: process.env.STORAGE_DIR || "./storage",
    cloudAiConnected: false,
    externalCdnsConnected: false,
    externalAnalyticsConnected: false,
  };
}

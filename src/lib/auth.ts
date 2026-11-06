import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { db } from "./db";

const AUTH_SECRET = process.env.AUTH_SECRET || "medbridge-production-secret-auth-key-at-least-32-chars-long";
const COOKIE_NAME = "medbridge_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  patientId: string | null;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Creates an HMAC SHA-256 signed session token.
 */
export function createSessionToken(user: SessionUser): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadData = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    patientId: user.patientId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    iat: Math.floor(Date.now() / 1000),
  };
  const payload = Buffer.from(JSON.stringify(payloadData)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/**
 * Verifies and decodes an HMAC SHA-256 session token.
 */
export function verifySessionToken(token: string): SessionUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    const expectedSig = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (expectedSig !== signature) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role as Role,
      patientId: decoded.patientId ?? null,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Retrieves the current session user from incoming request cookies.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function getSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

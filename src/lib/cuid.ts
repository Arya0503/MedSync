import crypto from "crypto";

export function cuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString("hex").substring(0, 10);
  return `c${timestamp}${randomPart}`;
}

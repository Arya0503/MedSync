import { NextRequest, NextResponse } from "next/server";
import { getSession, getSessionCookieOptions } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (session) {
    try {
      await writeAuditLog({
        actorId: session.id,
        actorRole: session.role,
        action: "auth.logout",
        entityType: "USER",
        entityId: session.id,
        patientId: session.patientId,
        payload: { email: session.email },
      });
    } catch (e) {}
  }

  const cookieOpts = getSessionCookieOptions();
  // If request came from a standard HTML form, redirect to /login
  const isForm = req.headers.get("content-type")?.includes("form");
  const res = isForm
    ? NextResponse.redirect(new URL("/login", req.url))
    : NextResponse.json({ success: true });

  res.cookies.set(cookieOpts.name, "", { ...cookieOpts, maxAge: 0 });
  return res;
}

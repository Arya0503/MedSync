import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, getSessionCookieOptions } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password format" }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      patientId: user.patientId,
    };

    const token = createSessionToken(sessionUser);

    // Audit login
    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "auth.login",
      entityType: "USER",
      entityId: user.id,
      patientId: user.patientId,
      payload: { email: user.email, role: user.role },
    });

    const res = NextResponse.json({ user: sessionUser });
    const cookieOpts = getSessionCookieOptions();
    res.cookies.set(cookieOpts.name, token, cookieOpts);
    return res;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error during authentication" }, { status: 500 });
  }
}

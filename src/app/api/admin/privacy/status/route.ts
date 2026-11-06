import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { getEgressStatus } from "@/lib/egressGuard";

export async function GET() {
  const session = await getSession();

  try {
    assertRole(session, [Role.ADMIN, Role.CLINICIAN, Role.PHARMACIST, Role.PATIENT]);
    const status = await getEgressStatus();
    return NextResponse.json({ status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

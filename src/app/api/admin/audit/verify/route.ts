import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { verifyAuditChain } from "@/lib/audit";

export async function POST() {
  const session = await getSession();

  try {
    assertRole(session, [Role.ADMIN]);
    const result = await verifyAuditChain();
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

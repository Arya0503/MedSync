import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { main as runSeed } from "../../../../../prisma/seed";

export async function POST() {
  const session = await getSession();

  try {
    assertRole(session, [Role.ADMIN]);
    await runSeed();
    return NextResponse.json({ success: true, message: "Synthetic seed executed successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertAuthenticated } from "@/lib/rbac";
import { revokeHandoverCard } from "@/lib/handover";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const cardId = params.id;

  try {
    assertAuthenticated(session);
    const card = await revokeHandoverCard(cardId, session.id, session.role);
    return NextResponse.json({ card });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

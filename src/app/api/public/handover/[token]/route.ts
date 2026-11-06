import { NextRequest, NextResponse } from "next/server";
import { getHandoverCardByToken } from "@/lib/handover";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const publicEnabled = process.env.HANDOVER_PUBLIC_ENABLED === "true";

  try {
    const data = await getHandoverCardByToken(token);

    if (!data || !data.card) {
      return NextResponse.json({ error: "Handover card not found" }, { status: 404 });
    }

    if (data.revoked) {
      return NextResponse.json({ error: "This handover card has been revoked by the patient or clinician." }, { status: 410 });
    }

    if (data.expired) {
      return NextResponse.json({ error: "This handover card has expired." }, { status: 410 });
    }

    return NextResponse.json({
      ...data,
      publicEnabled,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { createHandoverCard, generateQrCodeDataUrl } from "@/lib/handover";

const CreateCardSchema = z.object({
  daysValid: z.number().int().min(1).max(30).optional().default(7),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const patientId = params.id;

  try {
    await assertPatientAccess(session, patientId);

    let daysValid = 7;
    try {
      const body = await req.json();
      const parsed = CreateCardSchema.safeParse(body);
      if (parsed.success) {
        daysValid = parsed.data.daysValid;
      }
    } catch (e) {}

    const card = await createHandoverCard(patientId, session!.id, daysValid);

    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const handoverUrl = `${baseUrl}/h/${card.token}`;
    const qrDataUrl = await generateQrCodeDataUrl(handoverUrl);

    return NextResponse.json({
      card,
      url: handoverUrl,
      qrDataUrl,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

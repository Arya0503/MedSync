import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { generateHandoverPdf } from "@/lib/pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const patientId = params.id;

  try {
    await assertPatientAccess(session, patientId);

    const pdfBytes = await generateHandoverPdf(patientId, {
      id: session?.id,
      role: session?.role,
    });

    return new Response(pdfBytes as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="medbridge-summary-${patientId}.pdf"`,
        "Content-Length": pdfBytes.length.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

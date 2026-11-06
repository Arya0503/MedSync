import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const SettingsUpdateSchema = z.object({
  reduceMotion: z.boolean().optional(),
  bgMotion: z.boolean().optional(),
  textScale: z.number().int().min(80).max(200).optional(),
  highContrast: z.boolean().optional(),
  simpleMode: z.boolean().optional(),
  language: z.string().max(10).optional(),
  theme: z.string().max(20).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await db.userSettings.findUnique({
    where: { userId: session.id },
  });

  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = SettingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid settings payload", details: parsed.error }, { status: 400 });
    }

    const updated = await db.userSettings.upsert({
      where: { userId: session.id },
      update: parsed.data,
      create: {
        userId: session.id,
        ...parsed.data,
      },
    });

    await writeAuditLog({
      actorId: session.id,
      actorRole: session.role,
      action: "settings.changed",
      entityType: "USER_SETTINGS",
      entityId: session.id,
      patientId: session.patientId,
      payload: parsed.data,
    });

    return NextResponse.json({ settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

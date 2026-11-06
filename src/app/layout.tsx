import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#147A5F",
};

export const metadata: Metadata = {
  title: "MedBridge — Medication Continuity & Safe Handover",
  description:
    "Source-traceable, local-only medication reconciliation and handover across clinical visits.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  let userSettings = null;

  if (session) {
    userSettings = await db.userSettings.findUnique({
      where: { userId: session.id },
    });
  }

  return (
    <html lang={userSettings?.language || "en"}>
      <body className="antialiased">
        <Shell
          user={session}
          initialSettings={{
            bgMotion: userSettings?.bgMotion ?? true,
            reduceMotion: userSettings?.reduceMotion ?? false,
            highContrast: userSettings?.highContrast ?? false,
            simpleMode: userSettings?.simpleMode ?? false,
            textScale: userSettings?.textScale ?? 100,
            language: userSettings?.language ?? "en",
            theme: userSettings?.theme ?? "system",
          }}
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}

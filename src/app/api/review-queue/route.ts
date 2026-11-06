import { NextRequest, NextResponse } from "next/server";
import { Role, Severity, ReviewStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();

  try {
    assertRole(session, [Role.CLINICIAN, Role.PHARMACIST, Role.ADMIN]);

    const { searchParams } = new URL(req.url);
    const severityParam = searchParams.get("severity");
    const statusParam = searchParams.get("status");
    const overdueParam = searchParams.get("overdue");
    const query = searchParams.get("q")?.toLowerCase();

    const whereClause: any = {};

    // For clinicians/pharmacists: only show discrepancies for patients they have access to
    if (session.role !== Role.ADMIN) {
      const activeGrants = await db.accessGrant.findMany({
        where: { userId: session.id, revokedAt: null },
        select: { patientId: true },
      });
      whereClause.patientId = { in: activeGrants.map((g) => g.patientId) };
    }

    if (severityParam && Object.values(Severity).includes(severityParam as Severity)) {
      whereClause.severity = severityParam as Severity;
    }

    if (statusParam && Object.values(ReviewStatus).includes(statusParam as ReviewStatus)) {
      whereClause.status = statusParam as ReviewStatus;
    } else if (!statusParam) {
      // Default to PENDING + ESCALATED
      whereClause.status = { in: [ReviewStatus.PENDING, ReviewStatus.ESCALATED] };
    }

    if (overdueParam === "true") {
      whereClause.dueAt = { lt: new Date() };
    }

    if (query) {
      whereClause.OR = [
        { drugLabel: { contains: query, mode: "insensitive" } },
        { detail: { contains: query, mode: "insensitive" } },
        { patient: { name: { contains: query, mode: "insensitive" } } },
        { patient: { mrn: { contains: query, mode: "insensitive" } } },
      ];
    }

    const discrepancies = await db.discrepancy.findMany({
      where: whereClause,
      orderBy: [{ severity: "asc" }, { dueAt: "asc" }],
      include: {
        patient: {
          select: { id: true, name: true, mrn: true, dob: true },
        },
        actions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Fetch full entries for each discrepancy so reviewer can see side-by-side values
    const allEntryIds = Array.from(new Set(discrepancies.flatMap((d) => d.entryIds)));
    const entries = await db.medicationEntry.findMany({
      where: { id: { in: allEntryIds } },
      include: {
        visit: true,
        document: true,
        fields: true,
      },
    });

    const entriesMap = new Map(entries.map((e) => [e.id, e]));

    const enriched = discrepancies.map((d) => {
      const now = new Date();
      const isOverdue = d.dueAt < now && (d.status === ReviewStatus.PENDING || d.status === ReviewStatus.ESCALATED);
      const hoursRemaining = Number(((d.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(1));

      return {
        ...d,
        isOverdue,
        hoursRemaining,
        entries: d.entryIds.map((id) => entriesMap.get(id)).filter(Boolean),
      };
    });

    return NextResponse.json({
      discrepancies: enriched,
      totalCount: enriched.length,
      userRole: session.role,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

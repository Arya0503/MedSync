import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/rbac";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const patientId = params.id;

  try {
    await assertPatientAccess(session, patientId);

    const visits = await db.visit.findMany({
      where: { patientId },
      orderBy: { visitDate: "asc" },
      include: {
        entries: {
          where: { confirmed: true },
          include: {
            drug: true,
            document: true,
            fields: true,
          },
        },
      },
    });

    // Group confirmed entries by drug
    const drugMap = new Map<string, {
      drugId: string | null;
      drugName: string;
      entries: typeof visits[0]["entries"];
    }>();

    for (const v of visits) {
      for (const entry of v.entries) {
        const key = entry.drugId ?? entry.drugNameRaw.toLowerCase().trim();
        if (!drugMap.has(key)) {
          drugMap.set(key, {
            drugId: entry.drugId,
            drugName: entry.drug?.canonicalName ?? entry.drugNameRaw,
            entries: [],
          });
        }
        drugMap.get(key)!.entries.push(entry);
      }
    }

    const rows = [];

    for (const [, group] of drugMap.entries()) {
      let firstSeenVisitIndex = -1;
      let hasChanges = false;
      let previousEntry: typeof visits[0]["entries"][0] | null = null;

      const cells = visits.map((visit, vIdx) => {
        const entry = group.entries.find((e: any) => e.visitId === visit.id);

        if (!entry) {
          return {
            visitId: visit.id,
            present: false,
            statusLabel: firstSeenVisitIndex !== -1 && vIdx > firstSeenVisitIndex ? "Not listed" : "Not listed",
            entry: null,
            accessibleAriaName: `${group.drugName}, ${visit.facility}, Not listed in this visit record.`,
          };
        }

        if (firstSeenVisitIndex === -1) {
          firstSeenVisitIndex = vIdx;
        }

        let statusLabel: "New" | "Changed" | "Steady" = "Steady";

        if (vIdx === firstSeenVisitIndex && vIdx > 0) {
          statusLabel = "New";
          hasChanges = true;
        } else if (previousEntry) {
          const strengthDiffers = (entry.strengthRaw || "").trim().toLowerCase() !== (previousEntry.strengthRaw || "").trim().toLowerCase();
          const instructionDiffers = (entry.instructionRaw || "").trim().toLowerCase() !== (previousEntry.instructionRaw || "").trim().toLowerCase();

          if (strengthDiffers || instructionDiffers) {
            statusLabel = "Changed";
            hasChanges = true;
          }
        }

        previousEntry = entry;

        const primaryField = entry.fields[0];
        const accessibleAriaName = `${group.drugName}, ${visit.facility}, ${entry.strengthRaw || ""}, ${
          entry.instructionRaw || "no instruction recorded"
        }, ${statusLabel === "Changed" ? "changed from previous visit" : statusLabel === "New" ? "newly added in this visit" : "unchanged"}. Open source.`;

        return {
          visitId: visit.id,
          present: true,
          statusLabel,
          entry: {
            id: entry.id,
            drugName: entry.drugNameRaw,
            strength: entry.strengthRaw,
            form: entry.formRaw,
            instruction: entry.instructionRaw,
            documentId: entry.documentId,
            documentLineId: primaryField?.lineId,
            page: primaryField?.page ?? 1,
            box: primaryField ? { x: primaryField.x, y: primaryField.y, w: primaryField.w, h: primaryField.h } : null,
          },
          accessibleAriaName,
        };
      });

      rows.push({
        drugId: group.drugId,
        drugName: group.drugName,
        hasChanges,
        cells,
      });
    }

    return NextResponse.json({
      visits: visits.map((v) => ({
        id: v.id,
        facility: v.facility,
        visitType: v.visitType,
        visitDate: v.visitDate.toISOString().split("T")[0],
      })),
      rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

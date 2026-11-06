import React from "react";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { assertRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { AdminAuditVerifier } from "@/components/AdminAuditVerifier";
import { AdminSeedButton } from "@/components/AdminSeedButton";
import { IconShield, IconUsers, IconCheckCircle } from "@/components/icons";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    assertRole(session, [Role.ADMIN]);
  } catch (e) {
    redirect("/");
  }

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { patient: true, grants: true },
  });

  const auditLogs = await db.auditLog.findMany({
    orderBy: { seq: "desc" },
    take: 50,
  });

  const patients = await db.patient.findMany({
    orderBy: { createdAt: "desc" },
    include: { grants: { include: { user: true } } },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Admin Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div>
          <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-soft/40 text-accent uppercase tracking-wider">
            System Administration
          </span>
          <h1 className="font-serif text-3xl font-bold text-ink mt-1">
            System Overseer & Security Console
          </h1>
          <p className="text-sm text-ink-soft mt-0.5">
            Cryptographic audit chain verification, user access grants, and local synthetic seed tools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AdminSeedButton />
        </div>
      </div>

      {/* Cryptographic Chain Integrity Verification Section */}
      <section id="audit" aria-labelledby="audit-verifier-heading">
        <AdminAuditVerifier totalLogs={auditLogs.length} />
      </section>

      {/* Users & Access Grants Management */}
      <section id="users" aria-labelledby="users-heading" className="space-y-4">
        <h2 id="users-heading" className="font-serif text-2xl font-bold text-ink flex items-center gap-2">
          <IconUsers size={22} className="text-accent" />
          System Users & Clinical Access Grants ({users.length})
        </h2>

        <div className="surface-solid rounded-xl border border-line overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-ink">
              <thead className="bg-bg/80 border-b border-line text-ink-soft uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Linked Patient / Grants</th>
                  <th className="py-3 px-4">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-bg/40">
                    <td className="py-3 px-4 font-semibold text-ink">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-ink-soft">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-soft/30 text-accent border border-line">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-soft">
                      {u.patient ? (
                        <span>MRN: {u.patient.mrn}</span>
                      ) : (
                        <span>{u.grants.length} Active Grant(s)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-soft">
                      {u.createdAt.toISOString().split("T")[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Recent Append-Only Audit Entries */}
      <section aria-labelledby="audit-logs-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="audit-logs-heading" className="font-serif text-2xl font-bold text-ink">
            Append-Only Audit Trail (Recent 50 Events)
          </h2>
          <span className="text-xs font-mono text-ink-soft">
            Strictly Append-Only via Database Trigger
          </span>
        </div>

        <div className="surface-solid rounded-xl border border-line overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-ink">
              <thead className="bg-bg/80 border-b border-line text-ink-soft uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Seq</th>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor (Role)</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.seq.toString()} className="hover:bg-bg/40">
                    <td className="py-2 px-3 font-bold text-accent">#{log.seq.toString()}</td>
                    <td className="py-2 px-3 text-ink-soft">{log.ts.toISOString().replace("T", " ").substring(0, 19)}</td>
                    <td className="py-2 px-3 font-semibold text-ink">{log.action}</td>
                    <td className="py-2 px-3 text-ink-soft">{log.actorRole}</td>
                    <td className="py-2 px-3 text-ink-soft">{log.entityType}:{log.entityId.substring(0, 8)}</td>
                    <td className="py-2 px-3 text-ink-soft truncate max-w-[140px]" title={log.hash}>
                      {log.hash.substring(0, 14)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

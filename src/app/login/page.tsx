"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IconShield, IconUsers, IconFileText, IconCheckCircle } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      const role = data.user.role;
      if (role === "PATIENT") {
        router.push("/patient");
      } else if (role === "PHARMACIST") {
        router.push("/review");
      } else if (role === "CLINICIAN") {
        router.push("/clinic");
      } else if (role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Demo@1234");
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Editorial Branding Panel */}
        <div className="lg:col-span-5 gradient-hakkagoori dark:gradient-untitled rounded-2xl p-8 sm:p-10 flex flex-col justify-between border border-line shadow-lg surface-solid relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/90 border border-line text-xs font-semibold text-accent mb-6 shadow-sm">
              <IconShield size={14} /> Problem Statement 4 — Safe Handover
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight leading-tight mb-4">
              MedBridge
            </h1>
            <p className="text-sm text-ink-soft leading-relaxed mb-6 font-normal">
              One clear, source-traceable record of medication instructions across hospital discharge and outpatient visits.
            </p>
            <div className="space-y-3 text-xs text-ink-soft">
              <div className="flex items-start gap-2">
                <IconCheckCircle size={16} className="text-accent shrink-0 mt-0.5" />
                <span>Zero cloud AI: local-only processing runs on your hardware</span>
              </div>
              <div className="flex items-start gap-2">
                <IconCheckCircle size={16} className="text-accent shrink-0 mt-0.5" />
                <span>Verbatim instruction audit trail with tamper-evident SHA-256 chain</span>
              </div>
              <div className="flex items-start gap-2">
                <IconCheckCircle size={16} className="text-accent shrink-0 mt-0.5" />
                <span>Deterministic discrepancy detection across clinical visits</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-line/40 text-[11px] text-ink-soft">
            Synthetic clinical data only. Qualified healthcare professionals retain final clinical decisions.
          </div>
        </div>

        {/* Right Sign-in Form */}
        <div className="lg:col-span-7 bg-surface rounded-2xl p-8 sm:p-10 border border-line surface-elevated flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h2 className="font-serif text-2xl font-bold text-ink">Sign in to your record</h2>
              <p className="text-xs text-ink-soft mt-1">
                Access your verified medicines, reconcile visits, or review discrepancies.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-6 p-3 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs font-medium dark:bg-red-950/60 dark:border-red-800 dark:text-red-200"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="e.g. clinician@demo.test"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface text-ink text-sm focus:ring-2 focus:ring-focus focus:border-focus"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface text-ink text-sm focus:ring-2 focus:ring-focus focus:border-focus"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-lg bg-accent text-accent-ink font-semibold text-sm hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {loading ? "Authenticating locally..." : "Sign In"}
              </button>
            </form>
          </div>

          {/* Synthetic Demo Accounts Quick-Fill Section */}
          <div className="mt-8 pt-6 border-t border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-3">
              One-Click Synthetic Demo Roles (Password: Demo@1234)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("patient@demo.test")}
                className="p-2 rounded-lg border border-line text-left hover:bg-soft/20 text-xs text-ink transition-colors"
              >
                <span className="block font-bold">Patient</span>
                <span className="text-[10px] text-ink-soft">Asha R.</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("clinician@demo.test")}
                className="p-2 rounded-lg border border-line text-left hover:bg-soft/20 text-xs text-ink transition-colors"
              >
                <span className="block font-bold">Clinician</span>
                <span className="text-[10px] text-ink-soft">Dr. Mehta</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("pharmacist@demo.test")}
                className="p-2 rounded-lg border border-line text-left hover:bg-soft/20 text-xs text-ink transition-colors"
              >
                <span className="block font-bold">Pharmacist</span>
                <span className="text-[10px] text-ink-soft">Priya S., PharmD</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("admin@demo.test")}
                className="p-2 rounded-lg border border-line text-left hover:bg-soft/20 text-xs text-ink transition-colors"
              >
                <span className="block font-bold">Admin</span>
                <span className="text-[10px] text-ink-soft">System Overseer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

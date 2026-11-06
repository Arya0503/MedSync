"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { IconClose, IconShield, IconUsers, IconFileText, IconShare, IconPause, IconPlay } from "./icons";
import { LanguageCode } from "@/lib/i18n";

interface HamburgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: Role;
  userName?: string;
  patientId?: string | null;
  bgMotion: boolean;
  onToggleBgMotion: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  simpleMode: boolean;
  onToggleSimpleMode: () => void;
  textScale: number;
  onChangeTextScale: (scale: number) => void;
  language: LanguageCode;
  onChangeLanguage: (lang: LanguageCode) => void;
}

export function HamburgerDrawer({
  isOpen,
  onClose,
  userRole,
  userName,
  patientId,
  bgMotion,
  onToggleBgMotion,
  highContrast,
  onToggleHighContrast,
  simpleMode,
  onToggleSimpleMode,
  textScale,
  onChangeTextScale,
  language,
  onChangeLanguage,
}: HamburgerDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={onClose}
      aria-hidden={!isOpen}
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation and system menu"
        className="w-full max-w-md h-full bg-surface border-l border-line p-6 flex flex-col justify-between overflow-y-auto shadow-2xl surface-solid"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-line mb-6">
            <div>
              <h2 className="font-serif font-bold text-xl text-ink">Menu & Settings</h2>
              {userName && (
                <p className="text-xs text-ink-soft mt-0.5">
                  Signed in as <span className="font-semibold text-ink">{userName}</span> ({userRole})
                </p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 rounded-md hover:bg-soft/30 text-ink focus:ring-2 focus:ring-focus transition-colors"
              aria-label="Close menu drawer"
            >
              <IconClose size={20} />
            </button>
          </div>

          {/* Navigation Sections */}
          <div className="space-y-6">
            {/* Clinical & Patient Management */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
                Clinical Workspace
              </h3>
              <ul className="space-y-1.5" role="list">
                {userRole === Role.PATIENT && (
                  <>
                    <li>
                      <Link
                        href="/patient"
                        onClick={onClose}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-soft/20 text-ink"
                      >
                        <IconFileText size={16} /> My Verified Medicines
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/patient/documents"
                        onClick={onClose}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-soft/20 text-ink"
                      >
                        <IconFileText size={16} /> Uploaded Documents & Status
                      </Link>
                    </li>
                  </>
                )}

                {(userRole === Role.CLINICIAN || userRole === Role.PHARMACIST || userRole === Role.ADMIN) && (
                  <>
                    <li>
                      <Link
                        href="/clinic"
                        onClick={onClose}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-soft/20 text-ink"
                      >
                        <IconUsers size={16} /> Patients & Visits
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/review"
                        onClick={onClose}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-soft/20 text-ink"
                      >
                        <IconShield size={16} /> Reconciliation Review Queue
                      </Link>
                    </li>
                  </>
                )}

                {patientId && (
                  <li>
                    <a
                      href={`/api/patients/${patientId}/summary.pdf`}
                      download="medbridge-summary.pdf"
                      onClick={onClose}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-soft/20 text-ink"
                    >
                      <IconFileText size={16} /> Download Handover Summary PDF
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* System Oversight */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
                Trust & Verification
              </h3>
              <ul className="space-y-1.5" role="list">
                <li>
                  <Link
                    href="/privacy"
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-soft/20 text-ink"
                  >
                    <IconShield size={16} /> Privacy & Local Data Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy/status"
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-soft/20 text-ink"
                  >
                    <IconShield size={16} /> Privacy Status & Egress Audit
                  </Link>
                </li>
                {userRole === Role.ADMIN && (
                  <li>
                    <Link
                      href="/admin"
                      onClick={onClose}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-soft/20 text-ink"
                    >
                      <IconShield size={16} /> Admin Console & Chain Integrity
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    href="/accessibility"
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-soft/20 text-ink"
                  >
                    Accessibility Statement & Shortcuts
                  </Link>
                </li>
              </ul>
            </div>

            {/* Accessibility & Interaction Settings */}
            <div className="pt-2 border-t border-line">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-3">
                Accessibility Controls
              </h3>
              <div className="space-y-3 text-sm">
                {/* Background Motion */}
                <div className="flex items-center justify-between">
                  <span id="motion-label" className="text-ink font-medium">Background Drift</span>
                  <button
                    onClick={onToggleBgMotion}
                    aria-labelledby="motion-label"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-line hover:bg-soft/20 font-medium text-xs text-ink"
                  >
                    {bgMotion ? <IconPause size={14} /> : <IconPlay size={14} />}
                    {bgMotion ? "Pause" : "Play"}
                  </button>
                </div>

                {/* High Contrast */}
                <div className="flex items-center justify-between">
                  <span id="contrast-label" className="text-ink font-medium">High Contrast</span>
                  <button
                    onClick={onToggleHighContrast}
                    aria-labelledby="contrast-label"
                    className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                      highContrast ? "bg-accent text-accent-ink border-accent" : "border-line text-ink hover:bg-soft/20"
                    }`}
                  >
                    {highContrast ? "Enabled" : "Off"}
                  </button>
                </div>

                {/* Simple Mode */}
                <div className="flex items-center justify-between">
                  <span id="simple-label" className="text-ink font-medium">Simple Mode</span>
                  <button
                    onClick={onToggleSimpleMode}
                    aria-labelledby="simple-label"
                    className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                      simpleMode ? "bg-accent text-accent-ink border-accent" : "border-line text-ink hover:bg-soft/20"
                    }`}
                  >
                    {simpleMode ? "Enabled" : "Off"}
                  </button>
                </div>

                {/* Text Size Scaling */}
                <div>
                  <label htmlFor="text-scale-select" className="block text-ink font-medium mb-1">
                    Text Scale
                  </label>
                  <select
                    id="text-scale-select"
                    value={textScale}
                    onChange={(e) => onChangeTextScale(parseInt(e.target.value, 10))}
                    className="w-full bg-surface border border-line rounded px-2.5 py-1.5 text-xs text-ink"
                  >
                    <option value={100}>Default (100%)</option>
                    <option value={125}>Large (125%)</option>
                    <option value={150}>Extra Large (150%)</option>
                  </select>
                </div>

                {/* Interface Language */}
                <div>
                  <label htmlFor="language-select" className="block text-ink font-medium mb-1">
                    Language
                  </label>
                  <select
                    id="language-select"
                    value={language}
                    onChange={(e) => onChangeLanguage(e.target.value as LanguageCode)}
                    className="w-full bg-surface border border-line rounded px-2.5 py-1.5 text-xs text-ink"
                  >
                    <option value="en">English</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-line mt-6">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-md border border-line hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 text-ink font-medium text-sm transition-colors text-center"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

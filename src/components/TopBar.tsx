"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { IconHamburger, IconPause, IconPlay, IconSearch } from "./icons";
import { getDictionary, LanguageCode } from "@/lib/i18n";

interface TopBarProps {
  userRole?: Role;
  bgMotion: boolean;
  onToggleBgMotion: () => void;
  onOpenDrawer: () => void;
  isDrawerOpen: boolean;
  language?: LanguageCode;
}

export function TopBar({
  userRole,
  bgMotion,
  onToggleBgMotion,
  onOpenDrawer,
  isDrawerOpen,
  language = "en",
}: TopBarProps) {
  const pathname = usePathname();
  const dict = getDictionary(language);

  // Define role-specific primary links
  let primaryLinks: Array<{ label: string; href: string }> = [];

  if (userRole === Role.PATIENT) {
    primaryLinks = [
      { label: dict.myMedicines, href: "/patient" },
      { label: dict.documents, href: "/patient/documents" },
      { label: dict.share, href: "/patient#share" },
    ];
  } else if (userRole === Role.CLINICIAN) {
    primaryLinks = [
      { label: dict.patients, href: "/clinic" },
      { label: dict.upload, href: "/clinic#upload" },
      { label: dict.reviewQueue, href: "/review" },
    ];
  } else if (userRole === Role.PHARMACIST) {
    primaryLinks = [
      { label: dict.reviewQueue, href: "/review" },
      { label: dict.patients, href: "/clinic" },
    ];
  } else if (userRole === Role.ADMIN) {
    primaryLinks = [
      { label: dict.users, href: "/admin#users" },
      { label: dict.audit, href: "/admin#audit" },
      { label: dict.privacyStatus, href: "/privacy/status" },
    ];
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-surface/98 border-b border-line surface-solid backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-accent text-accent-ink flex items-center justify-center font-serif font-black text-lg shadow-sm">
              M
            </div>
            <div>
              <span className="font-serif font-bold text-xl tracking-tight text-ink group-hover:text-accent transition-colors">
                {dict.brand}
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono px-1.5 py-0.5 rounded bg-soft/40 text-ink-soft">
                Local-Only
              </span>
            </div>
          </Link>

          {/* Desktop Primary Navigation */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Primary navigation">
            {primaryLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-soft/40 text-ink font-semibold border-b-2 border-accent"
                      : "text-ink-soft hover:text-ink hover:bg-soft/20"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Search, Motion Toggle, and Hamburger Drawer Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search Bar */}
          <div className="relative hidden lg:block w-56 xl:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-soft">
              <IconSearch size={16} />
            </div>
            <input
              type="search"
              placeholder="Search record, drug, MRN..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg/80 border border-line rounded-lg text-ink placeholder:text-ink-soft focus:bg-surface focus:ring-2 focus:ring-focus"
              aria-label="Global search across records, medicines, and MRN"
            />
          </div>

          {/* Background Motion Toggle Button */}
          <button
            onClick={onToggleBgMotion}
            aria-label={bgMotion ? dict.pauseMotion : dict.playMotion}
            title={bgMotion ? dict.pauseMotion : dict.playMotion}
            className="p-2 rounded-lg border border-line text-ink hover:bg-soft/20 focus:ring-2 focus:ring-focus transition-colors"
          >
            {bgMotion ? <IconPause size={18} /> : <IconPlay size={18} />}
          </button>

          {/* Hamburger Drawer Trigger Button */}
          <button
            onClick={onOpenDrawer}
            aria-expanded={isDrawerOpen}
            aria-controls="hamburger-drawer-panel"
            aria-label="Open menu and accessibility settings"
            className="p-2 rounded-lg border border-line text-ink hover:bg-soft/20 focus:ring-2 focus:ring-focus transition-colors"
          >
            <IconHamburger size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

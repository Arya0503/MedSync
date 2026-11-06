"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { IconFileText, IconShare, IconUsers, IconShield, IconCompare } from "./icons";
import { getDictionary, LanguageCode } from "@/lib/i18n";

interface BottomTabBarProps {
  userRole?: Role;
  language?: LanguageCode;
}

export function BottomTabBar({ userRole, language = "en" }: BottomTabBarProps) {
  const pathname = usePathname();
  const dict = getDictionary(language);

  if (!userRole) return null;

  let tabs: Array<{ label: string; href: string; icon: React.ReactNode }> = [];

  if (userRole === Role.PATIENT) {
    tabs = [
      { label: dict.myMedicines, href: "/patient", icon: <IconFileText size={18} /> },
      { label: dict.documents, href: "/patient/documents", icon: <IconFileText size={18} /> },
      { label: dict.share, href: "/patient#share", icon: <IconShare size={18} /> },
    ];
  } else if (userRole === Role.CLINICIAN) {
    tabs = [
      { label: dict.patients, href: "/clinic", icon: <IconUsers size={18} /> },
      { label: dict.upload, href: "/clinic#upload", icon: <IconFileText size={18} /> },
      { label: dict.reviewQueue, href: "/review", icon: <IconShield size={18} /> },
    ];
  } else if (userRole === Role.PHARMACIST) {
    tabs = [
      { label: dict.reviewQueue, href: "/review", icon: <IconShield size={18} /> },
      { label: dict.patients, href: "/clinic", icon: <IconUsers size={18} /> },
    ];
  } else if (userRole === Role.ADMIN) {
    tabs = [
      { label: dict.users, href: "/admin#users", icon: <IconUsers size={18} /> },
      { label: dict.audit, href: "/admin#audit", icon: <IconShield size={18} /> },
      { label: dict.privacyStatus, href: "/privacy/status", icon: <IconShield size={18} /> },
    ];
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/98 border-t border-line surface-solid backdrop-blur-md pb-safe"
      aria-label="Mobile navigation bar"
    >
      <div className="flex justify-around items-center h-14 px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs transition-colors ${
                isActive
                  ? "text-accent font-semibold"
                  : "text-ink-soft hover:text-ink"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="mb-0.5">{tab.icon}</div>
              <span className="truncate max-w-[80px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

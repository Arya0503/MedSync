"use client";

import React, { useState, useEffect } from "react";
import { Role } from "@prisma/client";
import { TopBar } from "./TopBar";
import { HamburgerDrawer } from "./HamburgerDrawer";
import { BottomTabBar } from "./BottomTabBar";
import { BackgroundStage } from "./BackgroundStage";
import { LanguageCode } from "@/lib/i18n";
import { PERSISTENT_SAFETY_NOTICE } from "@/lib/safety";

interface ShellProps {
  children: React.ReactNode;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    patientId: string | null;
  } | null;
  initialSettings?: {
    bgMotion?: boolean;
    reduceMotion?: boolean;
    highContrast?: boolean;
    simpleMode?: boolean;
    textScale?: number;
    language?: string;
    theme?: string;
  };
}

export function Shell({ children, user, initialSettings }: ShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [bgMotion, setBgMotion] = useState(initialSettings?.bgMotion ?? true);
  const [highContrast, setHighContrast] = useState(initialSettings?.highContrast ?? false);
  const [simpleMode, setSimpleMode] = useState(initialSettings?.simpleMode ?? false);
  const [textScale, setTextScale] = useState(initialSettings?.textScale ?? 100);
  const [language, setLanguage] = useState<LanguageCode>((initialSettings?.language as LanguageCode) || "en");

  // Synchronize state attributes with document element for instant reactive styling without page reload
  useEffect(() => {
    const root = document.documentElement;

    // Background motion attribute
    if (!bgMotion || simpleMode) {
      root.setAttribute("data-motion", "off");
    } else {
      root.removeAttribute("data-motion");
    }

    // High Contrast attribute
    if (highContrast) {
      root.setAttribute("data-contrast", "high");
    } else {
      root.removeAttribute("data-contrast");
    }

    // Simple Mode attribute
    if (simpleMode) {
      root.setAttribute("data-simple", "true");
    } else {
      root.removeAttribute("data-simple");
    }

    // Text Scale attribute
    if (textScale !== 100) {
      root.setAttribute("data-scale", String(textScale));
    } else {
      root.removeAttribute("data-scale");
    }

    // Language attribute
    root.setAttribute("lang", language);
  }, [bgMotion, highContrast, simpleMode, textScale, language]);

  const handleToggleBgMotion = async () => {
    const nextVal = !bgMotion;
    setBgMotion(nextVal);
    // Persist to server in background
    if (user) {
      fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bgMotion: nextVal }),
      }).catch(() => {});
    }
  };

  const handleToggleHighContrast = async () => {
    const nextVal = !highContrast;
    setHighContrast(nextVal);
    if (user) {
      fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ highContrast: nextVal }),
      }).catch(() => {});
    }
  };

  const handleToggleSimpleMode = async () => {
    const nextVal = !simpleMode;
    setSimpleMode(nextVal);
    if (nextVal) {
      setBgMotion(false); // Simple mode disables motion
    }
    if (user) {
      fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simpleMode: nextVal }),
      }).catch(() => {});
    }
  };

  const handleChangeTextScale = async (scale: number) => {
    setTextScale(scale);
    if (user) {
      fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textScale: scale }),
      }).catch(() => {});
    }
  };

  const handleChangeLanguage = async (lang: LanguageCode) => {
    setLanguage(lang);
    if (user) {
      fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      }).catch(() => {});
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col selection:bg-soft selection:text-ink">
      {/* Keyboard Accessibility Skip Links */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {(user?.role === Role.CLINICIAN || user?.role === Role.PHARMACIST) && (
        <a href="/review" className="skip-link" style={{ left: "14rem" }}>
          Skip to review queue
        </a>
      )}

      {/* Moving Background Stage (Pauses on simpleMode or toggle) */}
      <BackgroundStage paused={!bgMotion || simpleMode} />

      {/* Top Navigation Bar */}
      <TopBar
        userRole={user?.role}
        bgMotion={bgMotion}
        onToggleBgMotion={handleToggleBgMotion}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        isDrawerOpen={isDrawerOpen}
        language={language}
      />

      {/* Accessible Hamburger Drawer */}
      <HamburgerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        userRole={user?.role}
        userName={user?.name}
        patientId={user?.patientId}
        bgMotion={bgMotion}
        onToggleBgMotion={handleToggleBgMotion}
        highContrast={highContrast}
        onToggleHighContrast={handleToggleHighContrast}
        simpleMode={simpleMode}
        onToggleSimpleMode={handleToggleSimpleMode}
        textScale={textScale}
        onChangeTextScale={handleChangeTextScale}
        language={language}
        onChangeLanguage={handleChangeLanguage}
      />

      {/* Main Content Landmark */}
      <main id="main-content" className="flex-1 pb-16 md:pb-8 focus:outline-none">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomTabBar userRole={user?.role} language={language} />

      {/* Persistent Safety Notice Footer */}
      <footer className="mt-auto border-t border-line bg-surface/95 surface-solid py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-ink-soft">
        <div className="max-w-5xl mx-auto space-y-1">
          <p className="font-semibold text-ink">
            {PERSISTENT_SAFETY_NOTICE}
          </p>
          <p className="text-[11px] opacity-80">
            MedBridge adheres strictly to local execution. Zero telemetry, zero cloud APIs, zero external requests.
          </p>
        </div>
      </footer>
    </div>
  );
}

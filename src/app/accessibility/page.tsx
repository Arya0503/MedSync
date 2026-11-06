import React from "react";
import { IconCheckCircle } from "@/components/icons";

export default function AccessibilityPage() {
  const shortcuts = [
    { key: "Tab / Shift+Tab", action: "Navigate forwards / backwards through interactive controls" },
    { key: "Enter / Space", action: "Activate buttons, expand sections, or select table cells" },
    { key: "Escape", action: "Close hamburger navigation drawer or open dialogs" },
    { key: "Arrow Keys (Up/Down)", action: "Navigate between items in the Review Queue and line list" },
    { key: "Skip Links (Top of page)", action: "Skip directly to main content or skip to review queue" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-soft/40 text-accent uppercase tracking-wider">
          Constraint 6: Universal Accessibility
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink mt-2">
          Accessibility Statement & Keyboard Guidelines
        </h1>
        <p className="text-sm text-ink-soft mt-1 leading-relaxed">
          MedBridge is committed to digital inclusivity, targeting full conformity with WCAG 2.2 Level AA.
        </p>
      </div>

      {/* Accessible Design Principles */}
      <div className="surface-solid rounded-xl p-6 border border-line space-y-4">
        <h2 className="font-serif text-xl font-bold text-ink">
          Five Core Universal Access Standards
        </h2>

        <div className="space-y-3 text-xs text-ink-soft leading-relaxed">
          <div className="flex items-start gap-2.5">
            <IconCheckCircle size={18} className="text-accent shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink text-sm">1. Keyboard-Only Navigation:</strong> Every single feature, button, link, and review queue action can be operated completely using only a keyboard. No hover-only, drag-only, or mouse-dependent mechanisms exist.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <IconCheckCircle size={18} className="text-accent shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink text-sm">2. Structured for Screen Readers:</strong> Comprehensive semantic HTML landmarks (<code className="font-mono text-accent">header</code>, <code className="font-mono text-accent">main</code>, <code className="font-mono text-accent">nav</code>, <code className="font-mono text-accent">table</code>), descriptive ARIA labels, live regions (<code className="font-mono text-accent">aria-live="polite"</code>), and explicit scope attributes on comparison tables.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <IconCheckCircle size={18} className="text-accent shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink text-sm">3. Zero Reliance on Colour Alone:</strong> Severity levels are always communicated via distinct geometric shapes (Octagon for High, Triangle for Medium, Circle for Low) paired with explicit text words.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <IconCheckCircle size={18} className="text-accent shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink text-sm">4. No Audio-Only Alerts:</strong> The application does not rely on sound cues or audio-only alarms. All clinical notifications and reminders are visual and text-based.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <IconCheckCircle size={18} className="text-accent shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink text-sm">5. Simple Mode & Large Targets:</strong> An alternative interaction mode (Simple mode) strips animations, uses a single-column layout, and scales touch targets to a minimum of 48×48px.
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Table */}
      <div id="shortcuts" className="surface-solid rounded-xl border border-line overflow-hidden p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-ink">
          Standard Keyboard Shortcuts
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-ink">
            <thead>
              <tr className="border-b border-line text-ink-soft uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Keystroke</th>
                <th className="py-2.5 px-3">Function / Behavior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {shortcuts.map((sc) => (
                <tr key={sc.key}>
                  <td className="py-2.5 px-3 font-mono font-bold text-accent">
                    {sc.key}
                  </td>
                  <td className="py-2.5 px-3 text-ink-soft">
                    {sc.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

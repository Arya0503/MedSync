"use client";

import React, { useState, useEffect } from "react";
import { IconCheckCircle } from "./icons";

interface VerifiedMedItem {
  name: string;
  strength: string;
  instruction: string;
}

interface Reminder {
  id: string;
  medName: string;
  strength: string;
  instruction: string;
  time: string; // e.g. "08:00"
}

export function PatientReminders({ verifiedMeds }: { verifiedMeds: VerifiedMedItem[] }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedMed, setSelectedMed] = useState(verifiedMeds[0]?.name || "");
  const [time, setTime] = useState("08:00");

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem("medbridge_reminders");
    if (saved) {
      try {
        setReminders(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveReminders = (next: Reminder[]) => {
    setReminders(next);
    localStorage.setItem("medbridge_reminders", JSON.stringify(next));
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    const med = verifiedMeds.find((m) => m.name === selectedMed);
    if (!med) return;

    const newReminder: Reminder = {
      id: Date.now().toString(),
      medName: med.name,
      strength: med.strength,
      instruction: med.instruction,
      time,
    };

    saveReminders([...reminders, newReminder]);
  };

  const handleDeleteReminder = (id: string) => {
    saveReminders(reminders.filter((r) => r.id !== id));
  };

  return (
    <div className="surface-solid rounded-xl p-6 border border-line space-y-6">
      <form onSubmit={handleAddReminder} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
        <div className="sm:col-span-6">
          <label htmlFor="med-select" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
            Choose Verified Medicine
          </label>
          <select
            id="med-select"
            value={selectedMed}
            onChange={(e) => setSelectedMed(e.target.value)}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink"
          >
            {verifiedMeds.map((med) => (
              <option key={med.name} value={med.name}>
                {med.name} ({med.strength})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="time-input" className="block text-xs font-bold uppercase tracking-wider text-ink mb-1">
            Visual Reminder Time
          </label>
          <input
            id="time-input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink"
          />
        </div>

        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={verifiedMeds.length === 0}
            className="w-full py-2.5 px-3 rounded-lg bg-accent text-accent-ink font-semibold text-xs hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            Add Reminder
          </button>
        </div>
      </form>

      {/* Reminders List */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
          Scheduled Visual Reminders
        </h4>
        {reminders.length === 0 ? (
          <p className="text-xs text-ink-soft italic">No personal reminders scheduled.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="p-3.5 rounded-lg border border-line bg-bg/60 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-accent">{rem.time}</span>
                    <span className="font-semibold text-xs text-ink">{rem.medName}</span>
                    <span className="text-[11px] font-mono text-ink-soft">({rem.strength})</span>
                  </div>
                  <p className="text-xs text-ink-soft mt-1.5 font-medium">
                    Instruction: "{rem.instruction}"
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteReminder(rem.id)}
                  className="text-ink-soft hover:text-red-700 text-xs font-semibold p-1"
                  aria-label={`Remove reminder for ${rem.medName}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

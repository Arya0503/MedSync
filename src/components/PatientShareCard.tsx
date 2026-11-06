"use client";

import React, { useState } from "react";
import Image from "next/image";
import { HandoverCard } from "@prisma/client";
import { IconShare, IconClose, IconCheckCircle } from "./icons";

interface PatientShareCardProps {
  patientId: string;
  existingCards: HandoverCard[];
}

export function PatientShareCard({ patientId, existingCards: initialCards }: PatientShareCardProps) {
  const [cards, setCards] = useState<HandoverCard[]>(initialCards);
  const [activeQr, setActiveQr] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreateCard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/handover-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysValid: 7 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCards([data.card, ...cards]);
      setActiveQr(data.qrDataUrl);
      setActiveUrl(data.url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCard = async (cardId: string) => {
    if (!confirm("Are you sure you want to revoke this handover card? The link will immediately stop functioning.")) return;

    try {
      const res = await fetch(`/api/handover-cards/${cardId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke card");

      setCards(cards.filter((c) => c.id !== cardId));
      if (activeUrl && activeUrl.includes(cardId)) {
        setActiveQr(null);
        setActiveUrl(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = () => {
    if (activeUrl) {
      navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="surface-solid rounded-xl p-6 border border-line space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">Active Handover Cards</h3>
          <p className="text-xs text-ink-soft">
            Cards provide read-only access to verified medicines only. Unresolved items remain marked as pending.
          </p>
        </div>
        <button
          onClick={handleCreateCard}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-ink font-semibold text-xs hover:opacity-95 disabled:opacity-50 transition-opacity"
        >
          <IconShare size={14} /> {loading ? "Generating..." : "Generate New Handover Card (7 Days)"}
        </button>
      </div>

      {/* Active QR View */}
      {activeQr && activeUrl && (
        <div className="p-4 rounded-lg bg-bg/90 border border-accent/40 flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-white p-2 rounded-lg border border-line shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeQr} alt="Handover QR Code" className="w-32 h-32" />
          </div>
          <div className="space-y-2 flex-1 text-center sm:text-left">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              New Handover Card Active
            </span>
            <p className="text-xs text-ink-soft break-all font-mono">{activeUrl}</p>
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 rounded border border-line text-xs font-semibold text-ink hover:bg-surface transition-colors"
              >
                {copied ? "Copied to clipboard!" : "Copy Link"}
              </button>
              <a
                href={activeUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded bg-accent text-accent-ink text-xs font-semibold hover:opacity-95 transition-opacity"
              >
                Open Handover View
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Cards Table */}
      {cards.length === 0 ? (
        <p className="text-xs text-ink-soft italic">No active handover cards created yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-ink">
            <thead>
              <tr className="border-b border-line text-ink-soft uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Token Prefix</th>
                <th className="py-2.5 px-3">Expires At</th>
                <th className="py-2.5 px-3">Views</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-b border-line/50 hover:bg-bg/40">
                  <td className="py-2.5 px-3 font-mono font-medium">
                    {card.token.substring(0, 10)}...
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {new Date(card.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3">{card.viewCount}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleRevokeCard(card.id)}
                      className="px-2.5 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/60 font-semibold text-[11px] transition-colors"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useEffect, useState } from "react";
import { updateProfileBadges } from "@/lib/db";
import type { BadgeItem } from "@/types";

const AVAILABLE_PROGRAMS = ["GSSoC", "Hacktoberfest", "EluSoC", "GSoC", "MLH Fellowship", "SWoC"];

interface ProfileBadgeModalProps {
  open: boolean;
  onClose: () => void;
  badgesList: BadgeItem[];
  onBadgesUpdate: (badges: BadgeItem[]) => void;
  profileId: string | null;
  username: string;
}

export function ProfileBadgeModal({
  open,
  onClose,
  badgesList,
  onBadgesUpdate,
  profileId,
  username,
}: ProfileBadgeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedProgram, setSelectedProgram] = useState("GSSoC");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }

    const handleClose = () => onClose();
    const handleClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        const clickInside =
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width;
        if (!clickInside) onClose();
      }
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleClick);
    };
  }, [open, onClose]);

  const handleAddBadge = async () => {
    if (!profileId) {
      alert("Please sync your profile first before adding badges.");
      return;
    }
    setIsSaving(true);
    try {
      const existingIndex = badgesList.findIndex((b) => b.program === selectedProgram);
      let updatedList: BadgeItem[];

      if (existingIndex > -1) {
        const currentYears = badgesList[existingIndex].years;
        const updatedYears = currentYears.includes(selectedYear)
          ? currentYears
          : [...currentYears, selectedYear].sort((a, b) => b - a);
        updatedList = badgesList.map((b, idx) =>
          idx === existingIndex ? { ...b, years: updatedYears } : b
        );
      } else {
        updatedList = [...badgesList, { program: selectedProgram, years: [selectedYear] }];
      }

      const { error } = await updateProfileBadges({
          id: profileId,
          username,
          badges: updatedList,
        });

      if (error) {
        alert(`Failed to save badge: ${error.message}`);
      } else {
        onBadgesUpdate(updatedList);
        onClose();
      }
    } catch (err) {
      console.error("Error saving badge:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        margin: 0,
        border: "1px solid var(--color-hairline)",
        borderRadius: "12px",
        padding: "24px",
        backgroundColor: "var(--color-canvas)",
        color: "var(--color-ink)",
        maxWidth: "400px",
        width: "calc(100% - 32px)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0, color: "var(--color-ink)", letterSpacing: "-0.2px" }}>
          Add Program Badge
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label htmlFor="program-select" style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-ink-mute)" }}>
            Program
          </label>
          <select
            id="program-select"
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--color-hairline-strong)",
              backgroundColor: "var(--color-canvas)",
              color: "var(--color-ink)",
              fontSize: "14px",
              width: "100%",
            }}
          >
            {AVAILABLE_PROGRAMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label htmlFor="year-select" style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-ink-mute)" }}>
            Year
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--color-hairline-strong)",
              backgroundColor: "var(--color-canvas)",
              color: "var(--color-ink)",
              fontSize: "14px",
              width: "100%",
            }}
          >
            {Array.from({ length: currentYear - 2000 + 1 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--color-ink)",
              backgroundColor: "var(--color-canvas)",
              border: "1px solid var(--color-hairline-strong)",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAddBadge}
            disabled={isSaving}
            style={{
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#ffffff",
              backgroundColor: "#3ecf8e",
              border: "none",
              borderRadius: "6px",
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            {isSaving ? "Saving..." : "Add"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

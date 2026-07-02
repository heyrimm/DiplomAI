"use client";

import type { Country } from "@/types";
import type { TabId } from "@/components/TabNav";

const NAV_ITEMS: { id: TabId; icon: string; label: string }[] = [
  { id: "overview",   icon: "◉", label: "개요" },
  { id: "oda",        icon: "◈", label: "ODA" },
  { id: "diplomacy",  icon: "◇", label: "외교" },
  { id: "simulation", icon: "◎", label: "시뮬" },
  { id: "report",     icon: "◻", label: "보고서" },
];

interface Props {
  countries: Country[];
  selectedId: string | null;
  activeNav: string;
  onCountryChange: (id: string) => void;
  onNavChange: (id: string) => void;
}

export default function Sidebar({ activeNav, onNavChange }: Props) {
  return (
    <aside className="side-rail">
      <div className="rail-logo">D</div>
      <div className="rail-divider" />
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`rail-nav-btn${activeNav === item.id ? " active" : ""}`}
          onClick={() => onNavChange(item.id)}
          title={item.label}
        >
          <span className="rail-nav-icon">{item.icon}</span>
          <span className="rail-nav-label">{item.label}</span>
        </button>
      ))}
    </aside>
  );
}

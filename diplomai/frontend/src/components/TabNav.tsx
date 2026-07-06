"use client";

export type TabId = "global" | "overview" | "oda" | "diplomacy" | "evaluate" | "simulation" | "report";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",   label: "종합 개요" },
  { id: "oda",        label: "ODA 분석" },
  { id: "diplomacy",  label: "공공외교" },
  { id: "simulation", label: "시뮬레이션" },
  { id: "report",     label: "보고서" },
];

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function TabNav({ active, onChange }: Props) {
  return (
    <nav className="nav-tabs" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          className={`nav-tab ${active === tab.id ? "active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

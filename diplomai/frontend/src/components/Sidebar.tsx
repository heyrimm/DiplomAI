"use client";

import { flagSrc } from "@/lib/flags";
import {
  ChevronDown, LayoutDashboard, BarChart, Globe, Sliders, FileText, TrendingUp,
} from "@/components/icons";
import type { ComponentType, SVGProps } from "react";
import type { Country } from "@/types";
import type { TabId } from "@/components/TabNav";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const NAV_ITEMS: { id: TabId; Icon: IconType; label: string }[] = [
  { id: "overview",   Icon: LayoutDashboard, label: "종합 개요" },
  { id: "oda",        Icon: BarChart,        label: "ODA 분석" },
  { id: "diplomacy",  Icon: Globe,           label: "공공외교" },
  { id: "simulation", Icon: Sliders,         label: "시뮬레이션" },
  { id: "report",     Icon: FileText,        label: "종합 보고서" },
];

interface Props {
  countries: Country[];
  selectedId: string | null;
  activeNav: string;
  onCountryChange: (id: string) => void;
  onNavChange: (id: string) => void;
}

export default function Sidebar({ selectedId, activeNav, onNavChange }: Props) {
  return (
    <aside className="side-rail">
      {/* Brand */}
      <div className="sb-brand">
        <span className="sb-brand-icon">D</span>
        <span className="sb-brand-name">DiplomAI</span>
      </div>

      {/* Global overview */}
      <div className="sb-section-label">전체</div>
      <button
        className={`sb-nav-item${activeNav === "global" ? " active" : ""}`}
        onClick={() => onNavChange("global")}
      >
        <span className="sb-nav-icon"><TrendingUp size={17} /></span>
        <span className="sb-nav-label">글로벌 현황</span>
      </button>

      {/* Selected country / store pill */}
      <div className="sb-section-label">분석 대상</div>
      <div className="sb-store">
        <span className="sb-store-badge">
          {selectedId && flagSrc(selectedId) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flagSrc(selectedId)!} alt="" className="sb-store-flag" />
          ) : (
            selectedId ? "🏳️" : "🌏"
          )}
        </span>
        <span className="sb-store-name">{selectedId ?? "국가 미선택"}</span>
        <span className="sb-store-chev"><ChevronDown size={15} /></span>
      </div>

      {/* Primary nav */}
      <div className="sb-section-label">분석</div>
      <nav>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sb-nav-item${activeNav === item.id ? " active" : ""}`}
            onClick={() => onNavChange(item.id)}
          >
            <span className="sb-nav-icon"><item.Icon size={17} /></span>
            <span className="sb-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sb-spacer" />

      {/* User profile */}
      <div className="sb-user">
        <span className="sb-user-avatar">외</span>
        <span className="sb-user-meta">
          <span className="sb-user-name">외교부 분석관</span>
          <span className="sb-user-role">KOICA · ODA 팀</span>
        </span>
        <span className="sb-user-chev"><ChevronDown size={15} /></span>
      </div>
    </aside>
  );
}

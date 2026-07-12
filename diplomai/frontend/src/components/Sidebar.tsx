"use client";

import { flagSrc } from "@/lib/flags";
import {
  ChevronDown, LayoutDashboard, BarChart, Globe, Sliders, FileText, TrendingUp, Target, Store,
} from "@/components/icons";
import type { ComponentType, SVGProps } from "react";
import type { Country } from "@/types";
import type { TabId } from "@/components/TabNav";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

// 사용자 업무 흐름 단계별로 묶은 내비게이션 (진단 → 설계 → 검증)
const NAV_GROUPS: { stage: string; items: { id: TabId; Icon: IconType; label: string }[] }[] = [
  {
    stage: "1 · 국가 진단",
    items: [
      { id: "overview",  Icon: LayoutDashboard, label: "종합 개요" },
      { id: "market",    Icon: Store,           label: "시장정보" },
      { id: "oda",       Icon: BarChart,        label: "ODA 분석" },
      { id: "diplomacy", Icon: Globe,           label: "공공외교" },
    ],
  },
  {
    stage: "2 · 사업 설계",
    items: [
      { id: "evaluate",  Icon: Target,          label: "사업 진단" },
      { id: "report",    Icon: FileText,        label: "보고서·계획서" },
    ],
  },
  {
    stage: "3 · 실행 검증",
    items: [
      { id: "simulation", Icon: Sliders,        label: "예산 시뮬레이션" },
    ],
  },
];

interface Props {
  countries: Country[];
  selectedId: string | null;
  activeNav: string;
  onCountryChange: (id: string) => void;
  onNavChange: (id: string) => void;
  onHome: () => void;
}

export default function Sidebar({ selectedId, activeNav, onNavChange, onHome }: Props) {
  return (
    <aside className="side-rail">
      {/* Brand → 국가 선택 화면으로 */}
      <button className="sb-brand" onClick={onHome} title="국가 선택 화면으로">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/diplomai-mark.png" alt="DiplomAI" className="sb-brand-img" />
        <span className="sb-brand-name">DiplomAI</span>
      </button>

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

      {/* Primary nav — 업무 흐름 단계별 그룹 */}
      <nav>
        {NAV_GROUPS.map((group) => (
          <div key={group.stage}>
            <div className="sb-section-label">{group.stage}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`sb-nav-item${activeNav === item.id ? " active" : ""}`}
                onClick={() => onNavChange(item.id)}
              >
                <span className="sb-nav-icon"><item.Icon size={17} /></span>
                <span className="sb-nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sb-spacer" />

      {/* User profile */}
      <div className="sb-user">
        <span className="sb-user-avatar">교</span>
        <span className="sb-user-meta">
          <span className="sb-user-name">국제교류 담당자</span>
          <span className="sb-user-role">지자체 · 대학 · NGO</span>
        </span>
        <span className="sb-user-chev"><ChevronDown size={15} /></span>
      </div>
    </aside>
  );
}

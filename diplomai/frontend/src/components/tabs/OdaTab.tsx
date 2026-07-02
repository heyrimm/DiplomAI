"use client";

import type { OdaBudgetResponse, OdaGapsResponse, PeerComparisonResponse } from "@/types";
import OdaGapBanner from "@/components/OdaGapBanner";
import HorizontalBarChart from "@/components/HorizontalBarChart";

const ONGOING_PROJECTS: { name: string; sector: string; period: string }[] = [
  { name: "농촌 스마트 농업 기술 보급 사업",   sector: "농업", period: "2022–2025" },
  { name: "모자보건 역량강화 사업 (3기)",       sector: "보건", period: "2023–2026" },
  { name: "초등 교육 접근성 강화 사업",         sector: "교육", period: "2021–2024" },
  { name: "직업훈련원 ICT 인프라 구축",         sector: "ICT",  period: "2024–2026" },
];

const SECTOR_BADGE: Record<string, string> = {
  농업: "badge-green", 보건: "badge-red", 교육: "badge-blue", ICT: "badge-neutral",
};

interface Props {
  budget: OdaBudgetResponse | null;
  gaps: OdaGapsResponse | null;
  peer: PeerComparisonResponse | null;
}

export default function OdaTab({ budget, gaps, peer }: Props) {
  const total        = budget?.total_억원 ?? budget?.sectors.reduce((s, i) => s + i.budget, 0) ?? 0;
  const projectCount = budget?.sectors.reduce((s, i) => s + i.projects, 0) ?? 0;

  const budgetItems = (budget?.sectors ?? []).map((s) => ({
    label: s.sector, value: s.budget, unit: "억",
  }));

  const peerItems = (peer?.peers ?? []).map((p) => ({
    label: p.country, value: p.pct, unit: "%",
    highlight: peer?.target.code === p.code,
    color: p.level === "높음" ? "bg-green-500" : p.level === "평균" ? "" : "bg-red-400",
  }));

  return (
    <div className="stack">
      {/* KPI row */}
      <div className="grid-3">
        <div className="kpi-card">
          <span className="kpi-label">연간 KOICA 예산</span>
          <span className="kpi-value">{Math.round(total).toLocaleString()}<span className="kpi-unit">억원</span></span>
          <span className="kpi-trend up">↑ 전년 대비 +6.2%</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">진행 중 사업 수</span>
          <span className="kpi-value">{projectCount}<span className="kpi-unit">건</span></span>
          <span className="kpi-trend neutral">교육 9 · 보건 6 · 기타</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">SDGs 커버리지</span>
          <span className="kpi-value">11<span className="kpi-unit">/17</span></span>
          <span className="kpi-trend neutral">SDG 4·3·1 집중</span>
        </div>
      </div>

      {/* Gap banner */}
      {gaps && <OdaGapBanner data={gaps} />}

      {/* Charts 2-col */}
      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <div className="card-head">
              <div>
                <p className="card-title">분야별 예산 분배</p>
                <p className="card-meta">단위: 억원 · {budget?.year ?? 2023}년</p>
              </div>
              {total > 0 && (
                <span className="badge badge-blue">총 {Math.round(total).toLocaleString()}억</span>
              )}
            </div>
            <HorizontalBarChart items={budgetItems} source="KOICA 공개데이터 2023" />
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="card-head">
              <div>
                <p className="card-title">유사국 비교 ({peer?.sector ?? "분야"} 예산 비중)</p>
                <p className="card-meta">단위: % · 강조 = 현재 국가</p>
              </div>
            </div>
            {peerItems.length > 0 ? (
              <>
                <HorizontalBarChart items={peerItems} maxValue={35} source="외교부 ODA 백서 2023" />
                <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
                  {(["낮음", "평균", "높음"] as const).map((lv) => (
                    <span key={lv} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
                      <span style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                        background: lv === "높음" ? "#10b981" : lv === "평균" ? "var(--accent)" : "#ef4444",
                      }} />
                      {lv}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>데이터 로딩 중...</p>
            )}
          </div>
        </div>
      </div>

      {/* Ongoing projects */}
      <div className="card">
        <div className="card-body">
          <p className="card-title" style={{ marginBottom: 14 }}>진행 중 주요 사업</p>
          <div className="project-list">
            {ONGOING_PROJECTS.map((p) => (
              <div key={p.name} className="project-item">
                <div className="project-left">
                  <span className={`badge ${SECTOR_BADGE[p.sector] ?? "badge-neutral"}`}>
                    {p.sector}
                  </span>
                  <span className="project-name">{p.name}</span>
                </div>
                <span className="project-period">{p.period}</span>
              </div>
            ))}
          </div>
          <p className="chart-source">출처: KOICA 사업정보시스템 (ODA KOICA)</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import type {
  Country, OdaBudgetResponse, OdaGapsResponse,
  Recommendation, TravelAlarm, SafetyNoticesResponse,
} from "@/types";
import HorizontalBarChart from "@/components/HorizontalBarChart";

interface Props {
  country: Country;
  budget: OdaBudgetResponse | null;
  gaps: OdaGapsResponse | null;
  recommendations: Recommendation[];
  alarm: TravelAlarm | null;
  safetyNotices: SafetyNoticesResponse | null;
}

const ALARM_CLS: Record<string, string> = {
  blue: "alarm-blue", yellow: "alarm-yellow", orange: "alarm-orange",
  red: "alarm-red", gray: "alarm-gray", green: "alarm-gray",
};

const RISK_FACTORS = [
  { label: "정치 안정성", level: "중간",  cls: "badge-amber" },
  { label: "자연재해",    level: "중간",  cls: "badge-amber" },
  { label: "감염병",      level: "낮음",  cls: "badge-green" },
  { label: "항공 접근성", level: "안정",  cls: "badge-blue" },
  { label: "사이버 보안", level: "주의",  cls: "badge-amber" },
];

export default function OverviewTab({
  country, budget, gaps, recommendations, alarm, safetyNotices,
}: Props) {
  const totalBudget = budget?.total_억원 ?? budget?.sectors.reduce((s, i) => s + i.budget, 0) ?? 0;
  const yoyPct      = budget?.yoy_pct;
  const riskScore   = Math.round((1 - country.hdi) * 100);

  const budgetItems = (budget?.sectors ?? []).slice(0, 5).map((s) => ({
    label: s.sector, value: s.budget, unit: "억",
  }));

  return (
    <div className="stack">
      {/* KPI row */}
      <div className="grid-3">
        <div className="kpi-card">
          <span className="kpi-label">리스크 스코어</span>
          <span className="kpi-value">
            {riskScore}<span className="kpi-unit">/100</span>
          </span>
          <span className="kpi-trend neutral">HDI 기반 산출</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">KOICA 연간 예산</span>
          <span className="kpi-value">
            {Math.round(totalBudget).toLocaleString()}
            <span className="kpi-unit">억원</span>
          </span>
          {yoyPct != null && (
            <span className={`kpi-trend ${yoyPct >= 0 ? "up" : "down"}`}>
              {yoyPct >= 0 ? "↑" : "↓"} 전년 대비 {yoyPct > 0 ? "+" : ""}{yoyPct}%
            </span>
          )}
        </div>
        <div className="kpi-card">
          <span className="kpi-label">HDI 지수</span>
          <span className="kpi-value">{country.hdi}</span>
          <span className="kpi-trend neutral">{country.region}</span>
        </div>
      </div>

      {/* Travel alarm */}
      {alarm && alarm.level !== "0" && (
        <div className={`alarm-badge ${ALARM_CLS[alarm.level_color] ?? "alarm-gray"}`}
          style={{ padding: "11px 16px", borderRadius: "var(--r-lg)", fontSize: 13.5 }}>
          <span style={{ fontSize: 16 }}>✈</span>
          <div>
            <p style={{ fontWeight: 600, color: "inherit" }}>
              외교부 여행경보 — {alarm.level_label}
            </p>
            {alarm.remark && (
              <p style={{ fontSize: 12.5, opacity: .8, marginTop: 2 }}>{alarm.remark}</p>
            )}
          </div>
          <span style={{ marginLeft: "auto", fontSize: 12, opacity: .65 }}>{alarm.source}</span>
        </div>
      )}

      {/* Gap banner */}
      {gaps && gaps.gaps.length > 0 && (
        <div className="gap-banner">
          <span className="gap-banner-icon">⚠</span>
          <div>
            <p className="gap-banner-title">
              ODA 사각지대 감지 — {gaps.gaps.map((g) => g.sector).join(" · ")}
            </p>
            <p className="gap-banner-desc">
              유사 소득 수준 국가 대비 해당 분야 ODA 비중이 낮습니다. 신규 사업 가능성이 높습니다.
            </p>
            <div className="gap-tags">
              {gaps.gaps.map((g) => (
                <span key={g.sector} className="gap-tag">{g.sector}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2-col: budget chart + safety */}
      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <div className="card-head">
              <div>
                <p className="card-title">분야별 ODA 분배</p>
                {budget && <p className="card-meta">출처: {(budget as any).source ?? "KOICA 공개데이터"}</p>}
              </div>
              {totalBudget > 0 && (
                <span className="badge badge-blue">총 {Math.round(totalBudget)}억</span>
              )}
            </div>
            <HorizontalBarChart items={budgetItems} source="KOICA 공개데이터 2023" />
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {safetyNotices && safetyNotices.notices.length > 0 ? (
              <>
                <div className="card-head">
                  <p className="card-title">외교부 안전공지</p>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{safetyNotices.source}</span>
                </div>
                <div className="stack">
                  {safetyNotices.notices.map((n, i) => (
                    <div key={i} style={{
                      paddingBottom: i < safetyNotices.notices.length - 1 ? 10 : 0,
                      borderBottom: i < safetyNotices.notices.length - 1 ? "1px solid var(--line)" : "none",
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", lineHeight: 1.4 }}>
                        {n.title}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{n.date}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="card-title" style={{ marginBottom: 14 }}>리스크 요인</p>
                <div className="stack">
                  {RISK_FACTORS.map((r) => (
                    <div key={r.label} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{r.label}</span>
                      <span className={`badge ${r.cls}`}>{r.level}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Top AI recommendation */}
      {recommendations[0] && (
        <div className="ai-insight">
          <div>
            <p className="ai-insight-label">✦ AI 추천 1순위</p>
            <p style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14, marginBottom: 5 }}>
              {recommendations[0].title}
            </p>
            <p className="ai-insight-text">{recommendations[0].rationale}</p>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <span className="badge badge-blue">{recommendations[0].sector}</span>
              <span className="badge badge-neutral">{recommendations[0].budget_estimate}</span>
              <span className="badge badge-neutral">{recommendations[0].duration}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

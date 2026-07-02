"use client";

import { useEffect, useState } from "react";
import type {
  Country, OdaBudgetResponse, OdaGapsResponse,
  Recommendation, TravelAlarm, SafetyNoticesResponse,
} from "@/types";
import HorizontalBarChart from "@/components/HorizontalBarChart";

interface AlarmLevel {
  level: string;
  label: string;
  color: string;
  count: number;
  countries: { country_eng: string; country_iso: string }[];
}

interface AlarmOverview {
  levels: AlarmLevel[];
  total_countries: number;
  source: string;
}

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

const LEVEL_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  "4": { bg: "rgba(185,28,28,.08)",  text: "#b91c1c", border: "rgba(185,28,28,.25)" },
  "3": { bg: "rgba(180,83,9,.08)",   text: "#b45309", border: "rgba(180,83,9,.25)"  },
  "2": { bg: "rgba(161,98,7,.07)",   text: "#a16207", border: "rgba(161,98,7,.22)"  },
  "1": { bg: "rgba(29,78,216,.07)",  text: "#1d4ed8", border: "rgba(29,78,216,.2)"  },
};

export default function OverviewTab({
  country, budget, gaps, recommendations, alarm, safetyNotices,
}: Props) {
  const [alarmOverview, setAlarmOverview] = useState<AlarmOverview | null>(null);
  const [showAllLevel, setShowAllLevel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/safety/overview")
      .then((r) => r.json())
      .then(setAlarmOverview)
      .catch(() => {});
  }, []);

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
          <span className="kpi-value">{riskScore}<span className="kpi-unit">/100</span></span>
          <span className="kpi-trend neutral">HDI 기반 산출</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">KOICA 연간 지원</span>
          <span className="kpi-value">{Math.round(totalBudget).toLocaleString()}<span className="kpi-unit">억원</span></span>
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

      {/* Travel alarm — 해당 국가 */}
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

      {/* 2-col: budget chart + safety notices */}
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
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", lineHeight: 1.4 }}>{n.title}</p>
                      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{n.date}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="card-title" style={{ marginBottom: 14 }}>국가 기본 정보</p>
                <p className="card-meta" style={{ marginBottom: 12 }}>출처: KOICA 협력국 통합 개발 지표</p>
                <div className="stack">
                  {([
                    ["인구",          `${(country.population / 1_000_000).toFixed(1)}M명`],
                    ["1인당 GDP",     `$${country.gdp_per_capita.toLocaleString()}`],
                    ["소득 수준",     country.income_level],
                    ["지역",          country.region],
                    country.internet_usage != null
                      ? ["인터넷 사용률", `${country.internet_usage.toFixed(1)}%`]
                      : null,
                    country.corruption_score != null
                      ? ["부패인식지수", `${country.corruption_score}/100`]
                      : null,
                    country.gii != null
                      ? ["젠더불평등지수", country.gii.toFixed(3)]
                      : null,
                  ] as ([string, string] | null)[]).filter(Boolean).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                      <span style={{ color: "var(--muted)" }}>{k}</span>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{v}</span>
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

      {/* ── 전 세계 외교부 여행경보 현황 ── */}
      {alarmOverview && (
        <div className="card">
          <div className="card-body">
            <div className="card-head" style={{ marginBottom: 16 }}>
              <div>
                <p className="card-title">전 세계 외교부 여행경보 현황</p>
                <p className="card-meta">경보 발령 국가 총 {alarmOverview.total_countries}개국 · {alarmOverview.source}</p>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 10 }}>
              {alarmOverview.levels.map((lv) => {
                const st = LEVEL_STYLE[lv.level] ?? LEVEL_STYLE["1"];
                const isExpanded = showAllLevel === lv.level;
                const visible = isExpanded ? lv.countries : lv.countries.slice(0, 8);

                return (
                  <div key={lv.level} style={{
                    padding: "14px 16px",
                    border: `1px solid ${st.border}`,
                    borderRadius: "var(--r-lg)",
                    background: st.bg,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: st.text }}>
                        {lv.label}
                      </span>
                      <span style={{
                        fontWeight: 700, fontSize: 20, color: st.text,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {lv.count}
                        <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>개국</span>
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 6px" }}>
                      {visible.map((c) => (
                        <span key={c.country_iso} style={{
                          fontSize: 11.5,
                          color: st.text,
                          opacity: .85,
                          background: "rgba(0,0,0,.04)",
                          padding: "1px 6px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                        }}>
                          {c.country_eng}
                        </span>
                      ))}
                      {lv.countries.length > 8 && (
                        <button
                          onClick={() => setShowAllLevel(isExpanded ? null : lv.level)}
                          style={{
                            fontSize: 11.5, color: st.text, opacity: .7,
                            background: "none", border: "none", cursor: "pointer",
                            padding: "1px 4px", textDecoration: "underline",
                          }}
                        >
                          {isExpanded ? "접기" : `+${lv.countries.length - 8}개 더보기`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

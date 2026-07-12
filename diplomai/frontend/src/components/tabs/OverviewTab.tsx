"use client";

import { useEffect, useState } from "react";
import type {
  Country, OdaBudgetResponse, OdaGapsResponse,
  Recommendation, TravelAlarm, SafetyNoticesResponse, AlarmHistoryItem,
} from "@/types";
import HorizontalBarChart from "@/components/HorizontalBarChart";
import OverviewInfographics from "@/components/OverviewInfographics";
import CitedText from "@/components/CitedText";

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

export default function OverviewTab({
  country, budget, gaps, recommendations, alarm, safetyNotices,
}: Props) {
  const [alarmHistory, setAlarmHistory] = useState<AlarmHistoryItem[]>([]);

  useEffect(() => {
    setAlarmHistory([]);
    fetch(`/api/safety/${encodeURIComponent(country.id)}/alarm-history`)
      .then((r) => r.json())
      .then((d) => setAlarmHistory(d.history ?? []))
      .catch(() => {});
  }, [country.id]);

  const totalBudget = budget?.total_억원 ?? budget?.sectors.reduce((s, i) => s + i.budget, 0) ?? 0;
  const yoyPct      = budget?.yoy_pct;
  const riskScore   = Math.round((1 - country.hdi) * 100);

  const budgetItems = (budget?.sectors ?? []).slice(0, 5).map((s) => ({
    label: s.sector, value: s.budget, unit: "억",
  }));

  return (
    <div className="stack">
      {/* 데이터로 보는 국가 — 인포그래픽 그리드 */}
      <OverviewInfographics country={country} budget={budget} gaps={gaps} alarm={alarm} />

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
                  ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
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
            <p className="ai-insight-text"><CitedText text={recommendations[0].rationale} /></p>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <span className="badge badge-blue">{recommendations[0].sector}</span>
              <span className="badge badge-neutral">{recommendations[0].budget_estimate}</span>
              <span className="badge badge-neutral">{recommendations[0].duration}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 여행경보 조정 이력 ── */}
      {alarmHistory.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="card-head" style={{ marginBottom: 14 }}>
              <div>
                <p className="card-title">여행경보 조정 이력</p>
                <p className="card-meta">출처: 외교부 여행경보 조정 (data.go.kr)</p>
              </div>
            </div>
            <div className="stack">
              {alarmHistory.map((h, i) => (
                <div key={i} style={{
                  paddingBottom: i < alarmHistory.length - 1 ? 12 : 0,
                  borderBottom: i < alarmHistory.length - 1 ? "1px solid var(--line)" : "none",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", lineHeight: 1.4, flex: 1 }}>
                      {h.title}
                    </p>
                    <span style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {h.date}
                    </span>
                  </div>
                  {h.summary && (
                    <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.5 }}>
                      {h.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

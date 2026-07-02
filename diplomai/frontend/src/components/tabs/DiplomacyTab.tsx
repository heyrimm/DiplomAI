"use client";

import type { DiplomacyResponse } from "@/types";
import HorizontalBarChart from "@/components/HorizontalBarChart";

interface Props {
  data: DiplomacyResponse | null;
}

export default function DiplomacyTab({ data }: Props) {
  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px", color: "var(--muted)", fontSize: 13 }}>
        데이터 로딩 중...
      </div>
    );
  }

  const channelItems = data.channels.map((c) => ({
    label: c.label,
    value: Number(c.score),
    unit: "점",
    color: Number(c.score) < 50 ? "bg-amber-400" : "",
  }));

  return (
    <div className="stack">
      {/* KPI row */}
      <div className="grid-3">
        <div className="kpi-card">
          <span className="kpi-label">한국어 학습자</span>
          <span className="kpi-value">{data.korean_learners.toLocaleString()}</span>
          <span className="kpi-trend up">↑ +{data.learners_yoy}% YoY</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">KF 공공외교 지수</span>
          <span className="kpi-value">{data.kf_index}<span className="kpi-unit">/100</span></span>
          <span className="kpi-trend neutral">{data.rank_in_region}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">한국 관광객</span>
          <span className="kpi-value">{(data.tourists / 1000).toFixed(0)}<span className="kpi-unit">K</span></span>
          <span className="kpi-trend up">↑ +{data.tourists_yoy}% YoY</span>
        </div>
      </div>

      {/* AI insight */}
      <div className="ai-insight">
        <div>
          <p className="ai-insight-label">✦ AI 인사이트</p>
          <p className="ai-insight-text">{data.ai_insight}</p>
        </div>
      </div>

      {/* Charts 2-col */}
      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <p className="card-title" style={{ marginBottom: 14 }}>채널별 공공외교 현황</p>
            <HorizontalBarChart
              items={channelItems}
              maxValue={100}
              source="KF 공공외교 통계센터 2023"
            />
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <p className="card-title" style={{ marginBottom: 14 }}>주요 트렌드 변화</p>
            <div className="stack">
              {data.trends.map((t) => (
                <div key={t.label} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--line)",
                }}>
                  <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{t.label}</span>
                  <span style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: t.value.startsWith("+") ? "var(--success)" : "var(--danger)",
                  }}>
                    {t.value}
                  </span>
                </div>
              ))}
            </div>
            <p className="chart-source">출처: 세종학당재단 연차보고서 2023</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="card-body">
          <p className="card-title" style={{ marginBottom: 16 }}>공공외교 타임라인</p>
          <div className="timeline">
            {data.timeline.map((t) => (
              <div key={t.year} className="timeline-item">
                <span className="timeline-year">{t.year}</span>
                <span className="timeline-dot" />
                <div className="timeline-content">
                  <p className="timeline-event">{t.event}</p>
                  <p className="timeline-detail">{t.detail}</p>
                </div>
                <span className="timeline-tag">{t.tag}</span>
              </div>
            ))}
          </div>
          <p className="chart-source">출처: KF 한국국제교류재단, 외교부 공공외교 포털</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import type { DiplomacyResponse, SejongYearCount } from "@/types";
import HorizontalBarChart from "@/components/HorizontalBarChart";

interface Props {
  data: DiplomacyResponse | null;
}

function SejongTrendBars({ history }: { history: SejongYearCount[] }) {
  const max = Math.max(...history.map((h) => h.count), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {history.map((h) => (
        <div key={h.year} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 36, fontSize: 12, color: "var(--muted)", textAlign: "right" }}>
            {h.year}
          </span>
          <div style={{ flex: 1, background: "var(--line)", borderRadius: 3, height: 14, overflow: "hidden" }}>
            <div
              style={{
                width: `${(h.count / max) * 100}%`,
                height: "100%",
                background: "var(--accent)",
                borderRadius: 3,
                minWidth: h.count > 0 ? 3 : 0,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <span style={{ width: 56, fontSize: 12, color: "var(--ink-soft)", textAlign: "right" }}>
            {h.count > 0 ? h.count.toLocaleString() : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DiplomacyTab({ data }: Props) {
  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px", color: "var(--muted)", fontSize: 13 }}>
        데이터 로딩 중...
      </div>
    );
  }

  const hasRealData = data.korean_learners != null || data.diaspora_count != null;
  const channelItems = (data.channels ?? []).map((c) => ({
    label: c.label,
    value: Number(c.score),
    unit: "점",
    color: Number(c.score) < 40 ? "bg-amber-400" : "",
  }));

  return (
    <div className="stack">
      {/* KPI 행 */}
      <div className="grid-3">
        <div className="kpi-card">
          <span className="kpi-label">한국어 학습자 (세종학당)</span>
          {data.korean_learners != null ? (
            <>
              <span className="kpi-value">
                {data.korean_learners.toLocaleString()}
                <span className="kpi-unit">명</span>
              </span>
              {data.learners_yoy != null && (
                <span className={`kpi-trend ${data.learners_yoy >= 0 ? "up" : "down"}`}>
                  {data.learners_yoy >= 0 ? "↑" : "↓"} {data.learners_yoy >= 0 ? "+" : ""}{data.learners_yoy}% YoY
                </span>
              )}
            </>
          ) : (
            <span className="kpi-value" style={{ fontSize: 20, color: "var(--faint)" }}>—</span>
          )}
        </div>

        <div className="kpi-card">
          <span className="kpi-label">재외동포</span>
          {data.diaspora_count != null && data.diaspora_count > 0 ? (
            <span className="kpi-value">
              {data.diaspora_count >= 10000
                ? `${(data.diaspora_count / 10000).toFixed(1)}`
                : data.diaspora_count.toLocaleString()}
              <span className="kpi-unit">{data.diaspora_count >= 10000 ? "만명" : "명"}</span>
            </span>
          ) : (
            <span className="kpi-value" style={{ fontSize: 20, color: "var(--faint)" }}>—</span>
          )}
        </div>

        <div className="kpi-card" title="세종학당 수강생(35%)·재외동포(45%)·재외공관 수(20%)를 log 정규화해 가중합한 자체 산출 지수 (0~100)">
          <span className="kpi-label">공공외교 지수 <span style={{ cursor: "help", opacity: .6 }}>ⓘ</span></span>
          {data.kf_index != null ? (
            <>
              <span className="kpi-value">
                {data.kf_index}
                <span className="kpi-unit">/100</span>
              </span>
              <span className="kpi-trend neutral">
                {data.embassy_count != null ? `재외공관 ${data.embassy_count}개소` : data.rank_in_region}
              </span>
            </>
          ) : (
            <span className="kpi-value" style={{ fontSize: 20, color: "var(--faint)" }}>—</span>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--faint)", marginTop: -6 }}>
        * 공공외교 지수는 세종학당 수강생(35%)·재외동포(45%)·재외공관 수(20%)를 log 정규화해 가중합한 자체 산출 지수입니다. 산식 상세는 README 참조.
      </p>

      {/* AI 인사이트 */}
      <div className="ai-insight">
        <div>
          <p className="ai-insight-label">✦ AI 인사이트</p>
          <p className="ai-insight-text">{data.ai_insight}</p>
        </div>
      </div>

      {/* 데이터 없는 국가 안내 */}
      {!hasRealData && (
        <div className="gap-banner info">
          <span className="gap-banner-icon">ℹ</span>
          <div>
            <p className="gap-banner-title">공공외교 데이터 미수집</p>
            <p className="gap-banner-desc">
              이 국가의 세종학당·재외동포 통계가 수집되지 않았습니다.
            </p>
          </div>
        </div>
      )}

      {/* 차트 행 */}
      {(channelItems.length > 0 || (data.sejong_history && data.sejong_history.length > 0)) && (
        <div className="grid-2">
          {channelItems.length > 0 && (
            <div className="card">
              <div className="card-body">
                <p className="card-title" style={{ marginBottom: 14 }}>채널별 공공외교 현황</p>
                <HorizontalBarChart
                  items={channelItems}
                  maxValue={100}
                  source="세종학당재단 (2025) · 외교부 재외동포현황 (2021)"
                />
              </div>
            </div>
          )}

          {data.sejong_history && data.sejong_history.length > 0 && (
            <div className="card">
              <div className="card-body">
                <p className="card-title" style={{ marginBottom: 14 }}>세종학당 수강생 추이</p>
                <SejongTrendBars history={data.sejong_history} />
                <p className="chart-source" style={{ marginTop: 12 }}>
                  출처: 세종학당재단 국가별 수강생 현황 2025
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 추이 카드 */}
      {(data.trends ?? []).length > 0 && (
        <div className="card">
          <div className="card-body">
            <p className="card-title" style={{ marginBottom: 14 }}>주요 지표 변화</p>
            <div className="stack">
              {data.trends.map((t) => (
                <div
                  key={t.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{t.label}</span>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: t.value.startsWith("+") ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {t.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 데이터 출처 */}
      {(data.data_sources ?? []).length > 0 && (
        <div style={{ padding: "8px 0", fontSize: 11.5, color: "var(--faint)" }}>
          출처: {data.data_sources!.join(" · ")}
        </div>
      )}
    </div>
  );
}

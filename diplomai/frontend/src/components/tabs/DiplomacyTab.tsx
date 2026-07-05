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

      {/* 공공외교 공백 신호 */}
      {data.kf_gap?.is_gap && (
        <div className="gap-banner">
          <span className="gap-banner-icon">⚠</span>
          <div>
            <p className="gap-banner-title">공공외교 공백 신호</p>
            <p className="gap-banner-desc">{data.kf_gap.reason}</p>
          </div>
        </div>
      )}

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

      {/* 한국학 · KF 사업 이력 */}
      {(data.korean_studies || data.kf_projects) && (
        <div className="grid-2">
          {data.korean_studies && (
            <div className="card">
              <div className="card-body">
                <p className="card-title" style={{ marginBottom: 12 }}>한국학 현황</p>
                <p style={{ fontSize: 22, fontWeight: 700 }}>
                  {data.korean_studies.universities}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}> 개 대학 운영</span>
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {[
                    ["학사", data.korean_studies.bachelor],
                    ["석사", data.korean_studies.master],
                    ["박사", data.korean_studies.doctoral],
                    ["교양·어학", data.korean_studies.sejong],
                    ["코리아코너", data.korean_studies.korea_corner],
                  ].filter(([, n]) => Number(n) > 0).map(([label, n]) => (
                    <span key={String(label)} style={{
                      fontSize: 12, padding: "3px 9px", borderRadius: 20,
                      background: "var(--surface-2)", color: "var(--ink-soft)",
                    }}>
                      {label} {n}
                    </span>
                  ))}
                </div>
                <p className="chart-source" style={{ marginTop: 12 }}>
                  출처: KF 해외대학 한국학 과정 운영현황 (data.go.kr, 2025)
                </p>
              </div>
            </div>
          )}

          {data.kf_projects && (
            <div className="card">
              <div className="card-body">
                <p className="card-title" style={{ marginBottom: 12 }}>KF 공공외교 사업 이력</p>
                <p style={{ fontSize: 22, fontWeight: 700 }}>
                  {data.kf_projects.total.toLocaleString()}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>
                    {" "}건 누적 ({data.kf_projects.first_year}~{data.kf_projects.last_year})
                  </span>
                </p>
                <div className="stack" style={{ marginTop: 10, gap: 4 }}>
                  {data.kf_projects.recent.slice(0, 4).map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, alignItems: "baseline" }}>
                      <span style={{ color: "var(--muted)", flexShrink: 0 }}>{p.year}</span>
                      <span style={{ color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    </div>
                  ))}
                </div>
                <p className="chart-source" style={{ marginTop: 12 }}>
                  출처: KF 융합 공공외교·ODA 사업정보 (data.go.kr)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 국내 지자체 교류 선례 (아프리카) */}
      {data.africa_exchanges && (
        <div className="card">
          <div className="card-body">
            <p className="card-title" style={{ marginBottom: 4 }}>국내 지자체 교류 선례</p>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>
              국내 지자체가 이 국가와 진행한 교류협력 {data.africa_exchanges.total}건 — 신규 사업 기획 시 연계·벤치마킹 가능
            </p>
            <div className="stack">
              {data.africa_exchanges.cases.map((c, i) => (
                <div key={i} style={{ padding: "10px 14px", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {c.province}{c.city && c.city !== c.province ? ` ${c.city}` : ""}
                      {c.partner && <span style={{ fontWeight: 400, color: "var(--muted)" }}> ↔ {c.partner}</span>}
                    </span>
                    <span style={{ color: "var(--muted)", flexShrink: 0 }}>{c.year} · {c.type}</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.5 }}>{c.desc}</p>
                </div>
              ))}
            </div>
            <p className="chart-source" style={{ marginTop: 12 }}>
              출처: 한아프리카재단 지자체-아프리카 교류협력 사례 (data.go.kr, 2023)
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
                  source="세종학당재단 (2025) · 외교부 재외동포현황 (2021) · KF 한국학·공공외교 사업정보 (data.go.kr)"
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

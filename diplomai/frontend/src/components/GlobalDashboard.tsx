"use client";

import { useEffect, useState } from "react";
import HorizontalBarChart from "@/components/HorizontalBarChart";

interface KoicaEntry  { name: string; total_만달러: number; }
interface SejongEntry { name: string; learners: number; }
interface GlobalSummary {
  kpis: { koica_countries: number; sejong_countries: number; total_learners: number };
  koica_top10: KoicaEntry[];
  sejong_top10: SejongEntry[];
  sources: { koica: string; sejong: string };
}
interface AlarmLevel {
  level: string; label: string; color: string; count: number;
  countries: { country_eng: string; country_iso: string }[];
}
interface AlarmOverview { levels: AlarmLevel[]; total_countries: number; source: string; }

const LEVEL_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  "4": { bg: "rgba(185,28,28,.08)",  text: "#b91c1c", border: "rgba(185,28,28,.25)" },
  "3": { bg: "rgba(180,83,9,.08)",   text: "#b45309", border: "rgba(180,83,9,.25)"  },
  "2": { bg: "rgba(161,98,7,.07)",   text: "#a16207", border: "rgba(161,98,7,.22)"  },
  "1": { bg: "rgba(29,78,216,.07)",  text: "#1d4ed8", border: "rgba(29,78,216,.2)"  },
};

export default function GlobalDashboard() {
  const [summary, setSummary]       = useState<GlobalSummary | null>(null);
  const [alarm, setAlarm]           = useState<AlarmOverview | null>(null);
  const [showAllLevel, setShowAll]  = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/global/summary").then(r => r.json()).then(setSummary).catch(() => {});
    fetch("/api/safety/overview").then(r => r.json()).then(setAlarm).catch(() => {});
  }, []);

  const alarmTotal = alarm?.levels.reduce((s, l) => s + l.count, 0) ?? 0;

  return (
    <div className="stack" style={{ padding: "32px 0 48px", maxWidth: 860, margin: "0 auto" }}>

      {/* ── 헤더 ── */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
          글로벌 ODA · 공공외교 현황
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
          상단 검색창에서 국가를 선택하면 국가별 심층 분석을 볼 수 있습니다
        </p>
      </div>

      {/* ── KPI 4칸 ── */}
      <div className="grid-3" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi-card">
          <span className="kpi-label">KOICA 지원 국가</span>
          <span className="kpi-value">
            {summary ? summary.kpis.koica_countries : "—"}
            <span className="kpi-unit">개국</span>
          </span>
          <span className="kpi-trend neutral">누적 지원실적 기준</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">세종학당 운영국</span>
          <span className="kpi-value">
            {summary ? summary.kpis.sejong_countries : "—"}
            <span className="kpi-unit">개국</span>
          </span>
          <span className="kpi-trend neutral">2025년 기준</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">한국어 학습자 (전 세계)</span>
          <span className="kpi-value">
            {summary ? Math.round(summary.kpis.total_learners / 10000).toLocaleString() : "—"}
            <span className="kpi-unit">만명</span>
          </span>
          <span className="kpi-trend neutral">세종학당 수강생 합계</span>
        </div>
      </div>

      {/* ── KOICA + 세종학당 차트 ── */}
      {summary && (
        <div className="grid-2">
          <div className="card">
            <div className="card-body">
              <div className="card-head" style={{ marginBottom: 14 }}>
                <div>
                  <p className="card-title">KOICA 상위 지원국 Top 10</p>
                  <p className="card-meta">출처: {summary.sources.koica}</p>
                </div>
              </div>
              <HorizontalBarChart
                items={summary.koica_top10.map((c, i) => ({
                  label: c.name,
                  value: c.total_만달러,
                  unit: "만$",
                  highlight: i === 0,
                }))}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="card-head" style={{ marginBottom: 14 }}>
                <div>
                  <p className="card-title">세종학당 학습자 Top 10</p>
                  <p className="card-meta">출처: {summary.sources.sejong}</p>
                </div>
              </div>
              <HorizontalBarChart
                items={summary.sejong_top10.map((c, i) => ({
                  label: c.name,
                  value: c.learners,
                  unit: "명",
                  highlight: i === 0,
                }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 여행경보 현황 ── */}
      {alarm && alarm.levels.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="card-head" style={{ marginBottom: 16 }}>
              <div>
                <p className="card-title">전 세계 외교부 여행경보 현황</p>
                <p className="card-meta">
                  경보 발령 국가 총 {alarmTotal}개국 · {alarm.source}
                </p>
              </div>
            </div>
            <div className="grid-2" style={{ gap: 10 }}>
              {alarm.levels.map((lv) => {
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
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: st.text }}>{lv.label}</span>
                      <span style={{ fontWeight: 700, fontSize: 20, color: st.text, fontVariantNumeric: "tabular-nums" }}>
                        {lv.count}<span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>개국</span>
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 6px" }}>
                      {visible.map((c) => (
                        <span key={c.country_iso} style={{
                          fontSize: 11.5, color: st.text, opacity: .85,
                          background: "rgba(0,0,0,.04)", padding: "1px 6px",
                          borderRadius: 4, whiteSpace: "nowrap",
                        }}>
                          {c.country_eng}
                        </span>
                      ))}
                      {lv.countries.length > 8 && (
                        <button
                          onClick={() => setShowAll(isExpanded ? null : lv.level)}
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

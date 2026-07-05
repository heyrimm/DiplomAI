"use client";

import { useEffect, useState } from "react";

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

interface GapEntry {
  country_id: string;
  region: string;
  oda_budget: number;
  oda_year: number | null;
  kf_total: number;
  kf_last_year: number | null;
  reason: string;
}
interface GapsResponse {
  gaps: GapEntry[];
  total_detected: number;
  criteria: string;
  sources: string[];
}

interface Props {
  onSelectCountry?: (id: string) => void;
}

const LEVEL_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "4": { bg: "rgba(185,28,28,.07)",  text: "#b91c1c", border: "rgba(185,28,28,.2)",  dot: "#b91c1c" },
  "3": { bg: "rgba(180,83,9,.07)",   text: "#b45309", border: "rgba(180,83,9,.2)",   dot: "#f59e0b" },
  "2": { bg: "rgba(161,98,7,.06)",   text: "#92400e", border: "rgba(161,98,7,.18)",  dot: "#d97706" },
  "1": { bg: "rgba(29,78,216,.06)",  text: "#1d4ed8", border: "rgba(29,78,216,.18)", dot: "#3b82f6" },
};

function RankList({
  items, valueLabel, color,
}: {
  items: { name: string; value: number }[];
  valueLabel: string;
  color: string;
}) {
  const max = items[0]?.value ?? 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: i === 0 ? color : "var(--faint)",
            width: 16, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums",
          }}>
            {i + 1}
          </span>
          <span style={{
            fontSize: 13, color: "var(--ink-soft)", width: 72, flexShrink: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontWeight: i === 0 ? 600 : 400,
          }}>
            {item.name}
          </span>
          <div style={{ flex: 1, height: 6, background: "var(--surface-3)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(item.value / max) * 100}%`,
              background: i === 0
                ? color
                : `color-mix(in srgb, ${color} 40%, var(--surface-3))`,
              borderRadius: 99,
              transition: "width .5s ease",
            }} />
          </div>
          <span style={{
            fontSize: 11.5, color: i === 0 ? "var(--ink)" : "var(--muted)",
            fontWeight: i === 0 ? 600 : 400,
            fontVariantNumeric: "tabular-nums",
            minWidth: 56, textAlign: "right", flexShrink: 0,
          }}>
            {item.value.toLocaleString()}{valueLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GlobalDashboard({ onSelectCountry }: Props) {
  const [summary, setSummary]      = useState<GlobalSummary | null>(null);
  const [alarm, setAlarm]          = useState<AlarmOverview | null>(null);
  const [gapsData, setGapsData]    = useState<GapsResponse | null>(null);
  const [showAllLevel, setShowAll] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/global/summary")
      .then(r => r.json())
      .then(d => { if (d?.kpis) setSummary(d); })
      .catch(() => {});
    fetch("/api/safety/overview")
      .then(r => r.json())
      .then(d => { if (d?.levels) setAlarm(d); })
      .catch(() => {});
    fetch("/api/global/gaps")
      .then(r => r.json())
      .then(d => { if (d?.gaps?.length) setGapsData(d); })
      .catch(() => {});
  }, []);

  const alarmTotal = alarm?.levels.reduce((s, l) => s + l.count, 0) ?? 0;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 0 56px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Hero 밴드 ── */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-xl)",
        padding: "32px 36px",
        display: "grid",
        gridTemplateColumns: "1fr 1px 1fr 1px 1fr",
        gap: 0,
        boxShadow: "var(--shadow-sm)",
      }}>
        {[
          {
            label: "KOICA 지원 국가",
            value: summary?.kpis.koica_countries,
            unit: "개국",
            sub: "누적 지원실적 기준",
          },
          {
            label: "세종학당 운영국",
            value: summary?.kpis.sejong_countries,
            unit: "개국",
            sub: "2025년 기준",
          },
          {
            label: "전 세계 한국어 학습자",
            value: summary ? Math.round(summary.kpis.total_learners / 10000).toLocaleString() : undefined,
            unit: "만명",
            sub: "세종학당 수강생 합계",
          },
        ].map((stat, i) => (
          <>
            {i > 0 && (
              <div key={`div-${i}`} style={{ background: "var(--line)", alignSelf: "stretch" }} />
            )}
            <div key={stat.label} style={{ padding: "0 28px", textAlign: i === 1 ? "center" : i === 2 ? "right" : "left" }}>
              <p style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 10 }}>
                {stat.label}
              </p>
              <p style={{ fontSize: 38, fontWeight: 800, color: "var(--ink)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {stat.value ?? "—"}
                <span style={{ fontSize: 14, fontWeight: 400, color: "var(--muted)", marginLeft: 5 }}>{stat.unit}</span>
              </p>
              <p style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>{stat.sub}</p>
            </div>
          </>
        ))}
      </div>

      {/* ── 공공외교 공백 국가 (핵심 차별 기능) ── */}
      {gapsData && (
        <div style={{
          background: "var(--surface)", border: "1px solid rgba(180,83,9,.25)",
          borderRadius: "var(--r-xl)", padding: "22px 24px",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                ⚠ 공공외교 공백 국가 <span style={{ color: "#b45309" }}>{gapsData.total_detected}개국 감지</span>
              </p>
              <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 3 }}>
                {gapsData.criteria} — KOICA·KF 데이터 교차 분석
              </p>
            </div>
            <span style={{
              fontSize: 10.5, fontWeight: 600, color: "#b45309",
              background: "rgba(180,83,9,.08)", padding: "2px 8px", borderRadius: 99,
              letterSpacing: ".04em", flexShrink: 0,
            }}>KOICA × KF</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            {gapsData.gaps.map((g) => (
              <button
                key={g.country_id}
                onClick={() => onSelectCountry?.(g.country_id)}
                style={{
                  textAlign: "left", cursor: "pointer",
                  padding: "11px 14px", borderRadius: "var(--r-md)",
                  border: "1px solid rgba(180,83,9,.18)",
                  background: "rgba(180,83,9,.04)",
                  transition: "background .15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                    {g.country_id}
                    <span style={{ fontSize: 11, fontWeight: 400, color: "var(--faint)", marginLeft: 6 }}>{g.region}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#b45309", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    ODA 연 {Math.round(g.oda_budget)}억
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>
                  {g.kf_total === 0
                    ? "KF 공공외교 사업 이력 없음"
                    : `KF 사업 ${g.kf_last_year}년 이후 중단 (누적 ${g.kf_total}건)`}
                  <span style={{ color: "var(--accent)", marginLeft: 6 }}>분석 보기 →</span>
                </p>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 10 }}>
            출처: {gapsData.sources.join(" · ")}
          </p>
        </div>
      )}

      {/* ── 랭킹 2열 ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* KOICA */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)", padding: "22px 24px",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>KOICA 누적 지원 Top 10</p>
              <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 3 }}>국가별 누적 지원액 (달러 기준)</p>
            </div>
            <span style={{
              fontSize: 10.5, fontWeight: 600, color: "var(--accent)",
              background: "var(--accent-soft)", padding: "2px 8px", borderRadius: 99,
              letterSpacing: ".04em",
            }}>KOICA</span>
          </div>
          {summary ? (
            <RankList
              items={summary.koica_top10.map(c => ({ name: c.name, value: c.total_만달러 }))}
              valueLabel="만$"
              color="var(--accent)"
            />
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, color: "var(--faint)" }}>로딩 중…</span>
            </div>
          )}
        </div>

        {/* 세종학당 */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)", padding: "22px 24px",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>세종학당 학습자 Top 10</p>
              <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 3 }}>국가별 한국어 수강생 수 (2025)</p>
            </div>
            <span style={{
              fontSize: 10.5, fontWeight: 600, color: "#047857",
              background: "rgba(4,120,87,.08)", padding: "2px 8px", borderRadius: 99,
              letterSpacing: ".04em",
            }}>세종학당</span>
          </div>
          {summary ? (
            <RankList
              items={summary.sejong_top10.map(c => ({ name: c.name, value: c.learners }))}
              valueLabel="명"
              color="#047857"
            />
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, color: "var(--faint)" }}>로딩 중…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 여행경보 현황 ── */}
      {alarm && alarm.levels.length > 0 && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)", padding: "22px 24px",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>전 세계 외교부 여행경보 현황</p>
              <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 3 }}>경보 발령 {alarmTotal}개국 · {alarm.source}</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {alarm.levels.map((lv) => {
              const st = LEVEL_STYLE[lv.level] ?? LEVEL_STYLE["1"];
              const isExpanded = showAllLevel === lv.level;
              const visible = isExpanded ? lv.countries : lv.countries.slice(0, 6);
              return (
                <div key={lv.level} style={{
                  padding: "14px 14px",
                  border: `1px solid ${st.border}`,
                  borderRadius: "var(--r-lg)",
                  background: st.bg,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: st.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: st.text }}>{lv.label}</span>
                    <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 800, color: st.text, fontVariantNumeric: "tabular-nums" }}>
                      {lv.count}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 4px" }}>
                    {visible.map((c) => (
                      <span key={c.country_iso} style={{
                        fontSize: 10.5, color: st.text, opacity: .8,
                        background: "rgba(0,0,0,.05)", padding: "1px 5px",
                        borderRadius: 3, whiteSpace: "nowrap",
                      }}>
                        {c.country_eng}
                      </span>
                    ))}
                    {lv.countries.length > 6 && (
                      <button
                        onClick={() => setShowAll(isExpanded ? null : lv.level)}
                        style={{
                          fontSize: 10.5, color: st.text, opacity: .65,
                          background: "none", border: "none", cursor: "pointer",
                          padding: "1px 3px", textDecoration: "underline",
                        }}
                      >
                        {isExpanded ? "접기" : `+${lv.countries.length - 6}개`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 안내 푸터 ── */}
      <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--faint)" }}>
        상단 검색창에서 국가명을 입력하면 국가별 ODA · 안전 · 공공외교 심층 분석을 볼 수 있습니다
      </p>
    </div>
  );
}

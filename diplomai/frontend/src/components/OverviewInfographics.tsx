"use client";

import type { Country, OdaBudgetResponse, OdaGapsResponse, TravelAlarm } from "@/types";

interface Props {
  country: Country;
  budget: OdaBudgetResponse | null;
  gaps?: OdaGapsResponse | null;
  alarm?: TravelAlarm | null;
}

/* 여행경보 단계 색 (현재 배너 색감 유지) */
const ALARM_TINT: Record<string, { bg: string; bd: string; tx: string }> = {
  blue:   { bg: "#eff6ff", bd: "#bfdbfe", tx: "#1d4ed8" },
  yellow: { bg: "#fffbeb", bd: "#fde68a", tx: "#b45309" },
  orange: { bg: "#fff7ed", bd: "#fed7aa", tx: "#c2410c" },
  red:    { bg: "#fef2f2", bd: "#fecaca", tx: "#b91c1c" },
};

/* 명도 차이로 구분되는 블루·뉴트럴 팔레트 (CVD 안전) */
const PIE = ["#1d4ed8", "#18181b", "#6b7fb3", "#3b82f6", "#aeb6c2", "#475569", "#93c5fd"];

/* ── 라운드캡 도넛 ── */
function Donut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = 148, sw = 22, r = (size - sw) / 2, c = size / 2, C = 2 * Math.PI * r;
  let acc = 0;
  const top = [...data].sort((a, b) => b.value - a.value)[0];
  return (
    <div className="ig-donut">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={sw} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = Math.max(0, frac * C - 4);
          const el = (
            <circle
              key={i} cx={c} cy={c} r={r} fill="none"
              stroke={PIE[i % PIE.length]} strokeWidth={sw} strokeLinecap="round"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-acc * C}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
          acc += frac;
          return el;
        })}
      </svg>
      <div className="ig-donut-center">
        <span className="ig-donut-pct">{Math.round((top.value / total) * 100)}%</span>
        <span className="ig-donut-lab">{top.label}</span>
      </div>
    </div>
  );
}

/* ── 라운드캡 링 게이지 ── */
function Ring({ pct, tone = "accent" }: { pct: number; tone?: "accent" | "dark" }) {
  const size = 130, sw = 14, r = (size - sw) / 2, c = size / 2, C = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const dash = (p / 100) * C;
  const color = tone === "dark" ? "#18181b" : "var(--accent)";
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="ig-ring">
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={sw} />
      <circle
        cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${dash} ${C - dash}`} transform={`rotate(-90 ${c} ${c})`}
      />
      <text x={c} y={c - 2} textAnchor="middle" dominantBaseline="central" className="ig-ring-num">
        {Math.round(p)}
      </text>
      <text x={c} y={c + 20} textAnchor="middle" className="ig-ring-unit">/ 100</text>
    </svg>
  );
}

function fmtPop(n: number) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}만`;
  return n.toLocaleString();
}

export default function OverviewInfographics({ country, budget, gaps, alarm }: Props) {
  const alarmTint = alarm ? (ALARM_TINT[alarm.level_color] ?? ALARM_TINT.red) : null;
  const gapSectors = (gaps?.gaps ?? []).map((g) => g.sector);
  const sectors = (budget?.sectors ?? [])
    .slice()
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 6)
    .map((s) => ({ label: s.sector, value: s.budget }));
  const total = budget?.total_억원 ?? sectors.reduce((s, x) => s + x.value, 0);
  const yoy = budget?.yoy_pct;
  const risk = Math.round((1 - country.hdi) * 100);

  return (
    <div className="ig-grid">
      {/* 분야별 ODA — 도넛 */}
      {sectors.length > 0 && (
        <div className="ig-card ig-span2">
          <span className="ig-title">분야별 ODA 분배</span>
          <div className="ig-donut-wrap">
            <Donut data={sectors} />
            <div className="ig-legend">
              {sectors.map((s, i) => (
                <div key={i} className="ig-legend-row">
                  <span className="ig-dot" style={{ background: PIE[i % PIE.length] }} />
                  <span className="ig-legend-lab">{s.label}</span>
                  <span className="ig-legend-val">{Math.round((s.value / (total || 1)) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KOICA 연간 지원 — 큰 숫자 */}
      <div className="ig-card">
        <span className="ig-title">KOICA 연간 지원</span>
        <span className="ig-big">{Math.round(total).toLocaleString()}<span className="ig-big-u">억원</span></span>
        {yoy != null && (
          <span className={`ig-trend ${yoy >= 0 ? "up" : "down"}`}>{yoy >= 0 ? "▲" : "▼"} 전년比 {yoy > 0 ? "+" : ""}{yoy}%</span>
        )}
      </div>

      {/* 1인당 GDP */}
      <div className="ig-card">
        <span className="ig-title">1인당 GDP</span>
        <span className="ig-big">${Math.round(country.gdp_per_capita).toLocaleString()}</span>
        <span className="ig-sub">{country.income_level}</span>
      </div>

      {/* 인구 */}
      <div className="ig-card">
        <span className="ig-title">인구</span>
        <span className="ig-big">{fmtPop(country.population)}<span className="ig-big-u">명</span></span>
        <span className="ig-sub">{country.region}</span>
      </div>

      {/* HDI — 링 */}
      <div className="ig-card ig-center">
        <span className="ig-title">인간개발지수 (HDI)</span>
        <Ring pct={country.hdi * 100} />
        <span className="ig-sub">1에 가까울수록 높음</span>
      </div>

      {/* 리스크 스코어 — 링 */}
      <div className="ig-card ig-center">
        <span className="ig-title">리스크 스코어</span>
        <Ring pct={risk} tone="dark" />
        <span className="ig-sub">HDI 기반 산출</span>
      </div>

      {/* 인터넷 사용률 — 링 (있을 때) */}
      {country.internet_usage != null && (
        <div className="ig-card ig-center">
          <span className="ig-title">인터넷 사용률</span>
          <Ring pct={country.internet_usage} />
          <span className="ig-sub">인구 대비 (%)</span>
        </div>
      )}

      {/* 부패인식지수 — 링 (있을 때) */}
      {country.corruption_score != null && (
        <div className="ig-card ig-center">
          <span className="ig-title">부패인식지수 (CPI)</span>
          <Ring pct={country.corruption_score} />
          <span className="ig-sub">높을수록 청렴</span>
        </div>
      )}

      {/* 젠더불평등지수 — 큰 숫자 (있을 때) */}
      {country.gii != null && (
        <div className="ig-card">
          <span className="ig-title">젠더불평등지수 (GII)</span>
          <span className="ig-big">{country.gii.toFixed(3)}</span>
          <span className="ig-sub">0에 가까울수록 평등</span>
        </div>
      )}

      {/* 외교부 여행경보 (색감 유지) */}
      {alarm && alarm.level !== "0" && alarmTint && (
        <div
          className="ig-card"
          style={{ background: alarmTint.bg, borderColor: alarmTint.bd }}
        >
          <span className="ig-title" style={{ color: alarmTint.tx }}>✈ 외교부 여행경보</span>
          <span className="ig-alert-v" style={{ color: alarmTint.tx }}>{alarm.level_label}</span>
          <span className="ig-sub">외교부 여행경보 · data.go.kr</span>
        </div>
      )}

      {/* ODA 사각지대 (앰버) */}
      {gapSectors.length > 0 && (
        <div className="ig-card" style={{ background: "var(--warning-soft)", borderColor: "rgba(180,83,9,.28)" }}>
          <span className="ig-title" style={{ color: "var(--warning)" }}>⚠ ODA 사각지대</span>
          <span className="ig-alert-v" style={{ color: "var(--warning)" }}>{gapSectors.length}개 분야</span>
          <div className="ig-chips">
            {gapSectors.slice(0, 4).map((s) => (
              <span key={s} className="ig-chip">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

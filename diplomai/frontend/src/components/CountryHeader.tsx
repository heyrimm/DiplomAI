"use client";

import type { Country, TravelAlarm } from "@/types";

interface Props {
  country: Country;
  riskCount: number;
  recommendCount: number;
  alarm?: TravelAlarm | null;
}

const ALL_FLAGS: Record<string, string> = {
  indonesia: "ID",
  vietnam:   "VN",
  cambodia:  "KH",
  ethiopia:  "ET",
};

function getRiskBadge(hdi: number): { label: string; cls: string } {
  if (hdi >= 0.7)  return { label: "리스크 낮음",  cls: "badge-green" };
  if (hdi >= 0.55) return { label: "리스크 중간",  cls: "badge-amber" };
  return              { label: "리스크 높음",  cls: "badge-red" };
}

function getAlarmClass(color?: string): string {
  const map: Record<string, string> = {
    blue: "alarm-blue", yellow: "alarm-yellow",
    orange: "alarm-orange", red: "alarm-red",
  };
  return map[color ?? ""] ?? "alarm-gray";
}

export default function CountryHeader({ country, riskCount, recommendCount, alarm }: Props) {
  const risk  = getRiskBadge(country.hdi);
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit" });

  /* other 3 country codes for satellite nodes */
  const otherIds = Object.keys(ALL_FLAGS).filter((id) => id !== country.id);
  const [nodeA, nodeB, nodeC] = otherIds;

  return (
    <section className="country-hero">
      {/* ── Left: text content ── */}
      <div className="hero-copy">
        <span className="hero-eyebrow">
          <span className="hero-eyebrow-pulse" />
          ODA 수원국 분석 · {today}
        </span>

        <h1 className="hero-title">{country.name}</h1>

        <p className="hero-sub">
          {country.name_en}&nbsp;&nbsp;·&nbsp;&nbsp;{country.region}
          &nbsp;&nbsp;·&nbsp;&nbsp;{country.income_level}
        </p>

        <div className="hero-badges">
          {alarm && alarm.level !== "0" && (
            <span className={`alarm-badge ${getAlarmClass(alarm.level_color)}`}>
              ✈ {alarm.level_label}
            </span>
          )}
          <span className={`badge ${risk.cls}`}>{risk.label}</span>
          {riskCount > 0 && (
            <span className="badge badge-amber">⚠ ODA 사각지대 {riskCount}개</span>
          )}
          {recommendCount > 0 && (
            <span className="badge badge-blue">✦ AI 추천 {recommendCount}건</span>
          )}
        </div>

        {/* Inline mini stats row */}
        <div className="hero-inline-stats">
          <div className="hero-inline-stat">
            <span className="his-label">인구</span>
            <span className="his-value">{(country.population / 1_000_000).toFixed(0)}M</span>
          </div>
          <div className="his-sep" />
          <div className="hero-inline-stat">
            <span className="his-label">1인당 GDP</span>
            <span className="his-value">${country.gdp_per_capita.toLocaleString()}</span>
          </div>
          <div className="his-sep" />
          <div className="hero-inline-stat">
            <span className="his-label">HDI</span>
            <span className="his-value">{country.hdi}</span>
          </div>
        </div>
      </div>

      {/* ── Right: animated diplomatic network art ── */}
      <div className="hero-art">
        <div className="aid-beam one" />
        <div className="aid-beam two" />
        <div className="aid-beam three" />

        {/* Hub node: Korea */}
        <div className="hub-node">KR</div>

        {/* Satellite nodes: the other 3 countries */}
        <div className="recv-node alpha">{ALL_FLAGS[nodeA] ?? "–"}</div>
        <div className="recv-node beta">{ALL_FLAGS[nodeB] ?? "–"}</div>
        <div className="recv-node gamma">{ALL_FLAGS[nodeC] ?? "–"}</div>

        {/* Two floating data cards — top corners only */}
        <div className="art-data-card primary">
          <span className="card-label">인구</span>
          <span className="card-value">
            {(country.population / 1_000_000).toFixed(0)}
            <span className="card-value-unit">M</span>
          </span>
          <span className="card-sub">백만 명</span>
        </div>

        <div className="art-data-card secondary">
          <span className="card-label">HDI</span>
          <span className="card-value">{country.hdi}</span>
          <span className="card-sub">인간개발지수</span>
        </div>
      </div>
    </section>
  );
}

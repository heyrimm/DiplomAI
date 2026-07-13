"use client";

import { useEffect, useState } from "react";
import {
  ComposableMap, Geographies, Geography, Marker,
} from "react-simple-maps";
import worldTopo from "world-atlas/countries-110m.json";
import CountUp from "@/components/CountUp";

interface Props {
  onSelectCountry?: (id: string) => void;
}

interface Summary {
  kpis: { koica_countries: number; sejong_countries: number; total_learners: number };
  koica_top10: { name: string; total_만달러: number }[];
}

interface AlarmLevel {
  level: string; label: string;
  count: number; countries: { country_eng: string; country_iso: string }[];
}
interface AlarmOverview { levels: AlarmLevel[]; total_countries: number }

/* 여행경보 단계 색 */
const LEVEL_COLOR: Record<string, string> = {
  "4": "#b91c1c", "3": "#c2410c", "2": "#b45309", "1": "#3b82f6",
};

/* 지도(world-atlas) 약어 국가명 → 여행경보 영문명 별칭 */
const NAME_ALIAS: Record<string, string> = {
  "dem. rep. congo": "democratic republic of the congo",
  "central african rep.": "central african republic",
  "s. sudan": "south sudan",
  "bosnia and herz.": "bosnia and herzegovina",
  "dominican rep.": "dominican republic",
  "eq. guinea": "equatorial guinea",
  "w. sahara": "western sahara",
  "solomon is.": "solomon islands",
  "united states of america": "united states",
  "czechia": "czech republic",
  "lao pdr": "laos",
  "north macedonia": "macedonia",
  "côte d'ivoire": "cote divoire",
  // 외교부 데이터 별난 표기 보정
  "republic of turkiye": "turkey",
  "italia": "italy",
  "bosnia-herzegovina": "bosnia and herzegovina",
};

/* 국가명 정규화 (매칭용) */
function norm(s: string): string {
  // "Papua New Guinea : PNG" 같은 접미 코드 제거
  const base = s.split(" : ")[0].trim();
  const key = base.toLowerCase();
  const aliased = NAME_ALIAS[key] ?? base;
  return aliased.toLowerCase()
    .replace(/\bthe\b/g, "")
    .replace(/&/g, "and")
    .replace(/[.,'’()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* 한국어 국가명 → [경도, 위도] (핀 표시용) */
const COORD: Record<string, [number, number]> = {
  베트남: [105.8, 21.0], 인도네시아: [113.9, -2.5], 필리핀: [121.0, 14.6],
  캄보디아: [104.9, 12.5], 몽골: [103.8, 46.9], 에티오피아: [39.6, 8.6],
  라오스: [103.9, 18.2], 미얀마: [96.7, 19.7], 방글라데시: [90.4, 23.7],
  우즈베키스탄: [64.6, 41.4], 스리랑카: [80.8, 7.9], 탄자니아: [34.9, -6.4],
  네팔: [84.1, 28.4], 파라과이: [-58.4, -23.4], 르완다: [29.9, -1.9],
  페루: [-75.0, -9.2], 우간다: [32.3, 1.4], 동티모르: [125.7, -8.8],
  볼리비아: [-64.7, -16.3], 콜롬비아: [-73.1, 4.0], 가나: [-1.0, 7.9],
  세네갈: [-14.5, 14.5], 케냐: [37.9, 0.5], 요르단: [36.2, 31.3],
  에콰도르: [-78.2, -1.4], "콩고 민주공화국": [23.6, -2.9], 이집트: [30.8, 26.8],
  모로코: [-7.1, 31.8], 이라크: [43.7, 33.2], 파키스탄: [69.3, 30.4],
  인도: [78.9, 22.6], 나이지리아: [8.7, 9.1],
};

const SECTORS = ["교육", "보건", "농림수산", "공공행정", "기술·환경·에너지", "긴급구호"];

function fmt(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}만`;
  return n.toLocaleString();
}

export default function GlobalMap({ onSelectCountry }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gapCount, setGapCount] = useState<number | null>(null);
  const [alarm, setAlarm] = useState<AlarmOverview | null>(null);
  const [activeLevel, setActiveLevel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/global/summary").then((r) => r.json()).then(setSummary).catch(() => {});
    fetch("/api/global/gaps").then((r) => r.json())
      .then((d) => setGapCount(d?.total_detected ?? null)).catch(() => {});
    fetch("/api/safety/overview").then((r) => r.json())
      .then((d) => { if (d?.levels) setAlarm(d); }).catch(() => {});
  }, []);

  const pins = (summary?.koica_top10 ?? [])
    .map((c) => ({ ...c, coord: COORD[c.name] }))
    .filter((c) => c.coord) as { name: string; total_만달러: number; coord: [number, number] }[];

  const koicaN = summary?.kpis.koica_countries ?? 70;

  // 선택 레벨의 국가 집합(정규화 이름) → 지도 하이라이트
  const activeSet = new Set(
    (alarm?.levels.find((l) => l.level === activeLevel)?.countries ?? [])
      .map((c) => norm(c.country_eng)),
  );
  const activeColor = activeLevel ? LEVEL_COLOR[activeLevel] ?? "#3b82f6" : null;

  return (
    <div className="gmap">
      {/* ── 좌: 큰 숫자 + 지표 ── */}
      <div className="gmap-side">
        <div className="gmap-hero">
          <CountUp value={koicaN} className="gmap-hero-num" />
          <span className="gmap-hero-lab">개국 지원 협력국</span>
        </div>

        <div className="gmap-stats">
          {gapCount != null && (
            <div className="gmap-stat">
              <CountUp value={gapCount} className="gmap-stat-num" />
              <span className="gmap-stat-lab">공공외교<br />공백 국가</span>
            </div>
          )}
          <div className="gmap-stat">
            <span className="gmap-stat-num">30<span className="gmap-stat-u">년+</span></span>
            <span className="gmap-stat-lab">KOICA<br />ODA 실적</span>
          </div>
          {summary && (
            <div className="gmap-stat">
              <CountUp value={summary.kpis.sejong_countries} className="gmap-stat-num" />
              <span className="gmap-stat-lab">세종학당<br />운영국</span>
            </div>
          )}
          {summary && (
            <div className="gmap-stat">
              <CountUp value={summary.kpis.total_learners} className="gmap-stat-num" format={fmt} />
              <span className="gmap-stat-lab">한국어<br />학습자</span>
            </div>
          )}
        </div>

        <div className="gmap-areas">
          <p className="gmap-areas-t">주요 지원 분야</p>
          <div className="gmap-areas-grid">
            {SECTORS.map((s) => <span key={s} className="gmap-area">{s}</span>)}
          </div>
        </div>
      </div>

      {/* ── 우: 세계지도 ── */}
      <div className="gmap-map">
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 165 }}
          width={820} height={420}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={worldTopo}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const hi = activeColor && activeSet.has(norm(geo.properties.name));
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={hi ? activeColor : "var(--surface-3)"}
                    stroke="var(--surface)"
                    strokeWidth={0.5}
                    style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
                  />
                );
              })
            }
          </Geographies>

          {/* 여행경보 미선택 시에만 KOICA 상위국 핀 표시 */}
          {!activeLevel && pins.map((p, i) => {
            const flip = i % 2 === 1;
            return (
              <Marker
                key={p.name}
                coordinates={p.coord}
                onClick={() => onSelectCountry?.(p.name)}
                style={{ default: { cursor: "pointer" } }}
              >
                <line x1={0} y1={0} x2={0} y2={flip ? 26 : -26} className="gmap-pin-line" />
                <circle r={4} className="gmap-pin-dot" />
                <text y={flip ? 38 : -30} textAnchor="middle" className="gmap-pin-label">{p.name}</text>
              </Marker>
            );
          })}
        </ComposableMap>

        {/* 우측 하단 — 여행경보 범례 (클릭 시 지도 표시) */}
        {alarm && alarm.levels.length > 0 && (
          <div className="gmap-alarm">
            <p className="gmap-alarm-t">외교부 여행경보 · {alarm.total_countries}개국</p>
            <div className="gmap-alarm-pills">
              {alarm.levels.map((lv) => (
                <button
                  key={lv.level}
                  className={`gmap-alarm-pill${activeLevel === lv.level ? " on" : ""}`}
                  style={activeLevel === lv.level ? { borderColor: LEVEL_COLOR[lv.level], background: `${LEVEL_COLOR[lv.level]}14` } : undefined}
                  onClick={() => setActiveLevel(activeLevel === lv.level ? null : lv.level)}
                >
                  <span className="gmap-alarm-dot" style={{ background: LEVEL_COLOR[lv.level] }} />
                  <span className="gmap-alarm-lab">{lv.label}</span>
                  <span className="gmap-alarm-cnt" style={{ color: LEVEL_COLOR[lv.level] }}>{lv.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="gmap-cap">
          {activeLevel
            ? "지도에 해당 경보 국가 표시 중 · 다시 누르면 해제"
            : "KOICA 지원 실적 상위국 · 핀 클릭 시 국가 분석 이동 · 출처 data.go.kr"}
        </p>
      </div>
    </div>
  );
}

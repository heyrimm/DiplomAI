"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { flagSrc } from "@/lib/flags";
import { Search } from "@/components/icons";
import type { Country } from "@/types";

interface Props {
  onSelect: (countryId: string) => void;
}

interface GapEntry {
  country_id: string;
  region: string;
  oda_budget: number;
  kf_total: number;
  kf_last_year: number | null;
}
interface GapsResponse {
  gaps: GapEntry[];
  total_detected: number;
  criteria: string;
}

/* 대륙 그룹 정의 (표시 순서대로) */
const CONTINENTS: { key: string; icon: string; label: string; regions: string[] }[] = [
  { key: "asia",    icon: "🌏", label: "아시아",     regions: ["동남아시아", "동아시아", "남아시아", "중앙아시아"] },
  { key: "mena",    icon: "🕌", label: "중동·북아프리카", regions: ["중동", "중동·북아프리카"] },
  { key: "africa",  icon: "🦁", label: "아프리카",     regions: ["사하라이남 아프리카"] },
  { key: "latam",   icon: "🌎", label: "중남미",      regions: ["중남미"] },
];

/* region이 비어있는 국가 보정 */
const REGION_OVERRIDE: Record<string, string> = {
  "콩고 민주공화국": "사하라이남 아프리카",
};

function continentOf(c: Country): string {
  const region = c.region || REGION_OVERRIDE[c.id] || "";
  const hit = CONTINENTS.find((g) => g.regions.includes(region));
  return hit ? hit.key : "etc";
}

export default function CountryLanding({ onSelect }: Props) {
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [query, setQuery] = useState("");
  const [gaps, setGaps] = useState<GapsResponse | null>(null);
  const [gapsExpanded, setGapsExpanded] = useState(false);

  useEffect(() => {
    api.searchCountries("").then(setCountries).catch(() => setCountries([]));
    fetch("/api/global/gaps")
      .then((r) => r.json())
      .then((d) => { if (d?.gaps?.length) setGaps(d); })
      .catch(() => {});
  }, []);

  /* KOICA 지원 실적 순위 (목록이 실적 내림차순) */
  const rankOf = new Map((countries ?? []).map((c, i) => [c.id, i + 1]));
  const countryById = new Map((countries ?? []).map((c) => [c.id, c]));

  const q = query.trim().toLowerCase();
  const matches = (c: Country) =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    (c.name_en ?? "").toLowerCase().includes(q) ||
    (c.region ?? "").toLowerCase().includes(q);

  const popular = (countries ?? []).slice(0, 5);

  const groups = [
    ...CONTINENTS.map((g) => ({
      ...g,
      items: (countries ?? []).filter((c) => continentOf(c) === g.key && matches(c)),
    })),
    {
      key: "etc",
      icon: "🌐",
      label: "기타",
      items: (countries ?? []).filter((c) => continentOf(c) === "etc" && matches(c)),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="landing">

      <div className="landing-head">
        <span className="landing-eyebrow">
          <span className="landing-eyebrow-dot" />
          국가 선택
        </span>
        <h2 className="landing-title">국가를 선택해 사업 설계를 시작하세요</h2>
      </div>

      {countries === null ? (
        <div className="loading-state">
          <span className="spinner" />
          <span>국가 목록 불러오는 중…</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">&ldquo;{query}&rdquo; 검색 결과가 없습니다</div>
      ) : (
        <div className="landing-groups">
          {/* ── 공공외교 공백 국가 (TOP TREND와 동일한 카드 그리드 폼) ── */}
          {!q && gaps && gaps.gaps.length > 0 && (
            <section className="continent-group">
              <div className="trend-header">
                <span className="trend-title trend-title-gap">공공외교 공백 국가</span>
                <span className="trend-sub">ODA는 활발하나 KF 공공외교가 없거나 끊긴 곳 · {gaps.total_detected}개국</span>
              </div>
              <div className="country-grid">
                {(gapsExpanded ? gaps.gaps : gaps.gaps.slice(0, 5)).map((g) => {
                  const c = countryById.get(g.country_id);
                  return (
                    <button
                      key={g.country_id}
                      className="country-card gap-card"
                      onClick={() => onSelect(g.country_id)}
                    >
                      <span className="cc-rank cc-rank-gap">⚠</span>
                      <span className="cc-icon">
                        {flagSrc(g.country_id) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={flagSrc(g.country_id)!} alt={`${c?.name ?? g.country_id} 국기`} className="cc-icon-img" />
                        ) : (
                          <span className="cc-icon-fallback">🏳️</span>
                        )}
                      </span>
                      <span className="cc-name">{c?.name ?? g.country_id}</span>
                      <span className="cc-meta gap-meta">ODA 연 {Math.round(g.oda_budget)}억 · 공백</span>
                      <span className="cc-cta">선택</span>
                    </button>
                  );
                })}
              </div>
              {gaps.gaps.length > 5 && (
                <button className="gap-more" onClick={() => setGapsExpanded((v) => !v)}>
                  {gapsExpanded ? "접기 ▴" : `전체 ${gaps.total_detected}개국 보기  +${gaps.gaps.length - 5} ▾`}
                </button>
              )}
            </section>
          )}

          <div className="trend-header">
            <span className="trend-title">KOICA 지원 실적 순</span>
          </div>
          {groups.map((g) => (
            <section key={g.key} className="continent-group">
              <div className="continent-title">
                <span className="continent-icon">{g.icon}</span>
                <span className="continent-label">{g.label}</span>
                <span className="continent-count">{g.items.length}</span>
              </div>

              <div className="country-grid">
                {g.items.map((c) => (
                  <button
                    key={c.id}
                    className="country-card"
                    onClick={() => onSelect(c.id)}
                  >
                    <span className="cc-rank">{rankOf.get(c.id)}</span>
                    <span className="cc-icon">
                      {flagSrc(c.id) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={flagSrc(c.id)!} alt={`${c.name} 국기`} className="cc-icon-img" />
                      ) : (
                        <span className="cc-icon-fallback">🏳️</span>
                      )}
                    </span>
                    <span className="cc-name">{c.name}</span>
                    <span className="cc-meta">
                      {c.name_en || c.region}
                      {c.income_level ? ` · ${c.income_level}` : ""}
                    </span>
                    <span className="cc-cta">선택</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { flagSrc } from "@/lib/flags";
import { Search } from "@/components/icons";
import type { Country } from "@/types";

interface Props {
  onSelect: (countryId: string) => void;
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

  useEffect(() => {
    api.searchCountries("").then(setCountries).catch(() => setCountries([]));
  }, []);

  /* KOICA 지원 실적 순위 (목록이 실적 내림차순) */
  const rankOf = new Map((countries ?? []).map((c, i) => [c.id, i + 1]));

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
      {/* ── 검색 히어로 ── */}
      <div className="landing-search">
        <div className="ls-input-wrap">
          <span className="ls-search-icon"><Search size={18} /></span>
          <input
            className="ls-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="국가 검색 (예: 베트남, 케냐, 인도네시아…)"
          />
          {query && (
            <button className="ls-clear" onClick={() => setQuery("")} aria-label="지우기">✕</button>
          )}
        </div>
        {popular.length > 0 && (
          <div className="ls-popular">
            <span className="ls-popular-label">인기 국가</span>
            {popular.map((c) => (
              <button key={c.id} className="ls-popular-item" onClick={() => onSelect(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="landing-head">
        <span className="landing-eyebrow">
          <span className="landing-eyebrow-dot" />
          국가 선택
        </span>
        <h2 className="landing-title">분석할 국가를 선택하세요</h2>
        <p className="landing-desc">
          KOICA 지원 실적 기준 <strong>30개 협력국</strong>을 대륙별로 정리했습니다.
          국가를 선택하면 ODA·공공외교·AI 사업 추천 분석이 시작됩니다.
        </p>
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
          <div className="trend-header">
            <span className="trend-title">TOP TREND</span>
            <span className="trend-sub">KOICA 지원 실적 순</span>
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

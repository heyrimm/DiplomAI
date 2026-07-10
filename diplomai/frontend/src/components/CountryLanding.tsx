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

      {/* ── 공공외교 공백 국가 — '어디서 시작할지' 첫 화면 제안 ── */}
      {gaps && gaps.gaps.length > 0 && (
        <div style={{
          marginTop: 18,
          background: "rgba(180,83,9,.05)",
          border: "1px solid rgba(180,83,9,.22)",
          borderRadius: "var(--r-lg, 14px)",
          padding: "14px 18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              ⚠ 공공외교 공백 국가 <span style={{ color: "#b45309" }}>{gaps.total_detected}개국</span>
            </span>
            <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
              ODA는 활발하나 공공외교(KF) 활동이 없거나 끊긴 곳 — 여기서 시작해 보세요
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(gapsExpanded ? gaps.gaps : gaps.gaps.slice(0, 6)).map((g) => (
              <button
                key={g.country_id}
                onClick={() => onSelect(g.country_id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                  padding: "7px 12px", borderRadius: 99,
                  border: "1px solid rgba(180,83,9,.28)", background: "var(--surface)",
                }}
              >
                {flagSrc(g.country_id) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={flagSrc(g.country_id)!} alt="" style={{ width: 16, height: 12, borderRadius: 2, objectFit: "cover" }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{g.country_id}</span>
                <span style={{ fontSize: 11, color: "#b45309", fontVariantNumeric: "tabular-nums" }}>
                  ODA 연 {Math.round(g.oda_budget)}억
                </span>
              </button>
            ))}
          </div>

          {gaps.gaps.length > 6 && (
            <button
              onClick={() => setGapsExpanded((v) => !v)}
              style={{
                width: "100%", marginTop: 10, padding: "8px 0", cursor: "pointer",
                background: "transparent", border: "none",
                borderTop: "1px dashed rgba(180,83,9,.25)",
                fontSize: 12, fontWeight: 600, color: "#b45309",
              }}
            >
              {gapsExpanded
                ? "접기 ▴"
                : `전체 ${gaps.total_detected}개국 펼쳐 보기  +${gaps.gaps.length - 6} ▾`}
            </button>
          )}
        </div>
      )}

      <div className="landing-head">
        <span className="landing-eyebrow">
          <span className="landing-eyebrow-dot" />
          국가 선택
        </span>
        <h2 className="landing-title">국가를 선택해 사업 설계를 시작하세요</h2>
        <p className="landing-desc">
          지자체·대학·NGO의 국제교류 담당자를 위한 공공데이터 기반 사업 설계 도구입니다.
          국가를 고르면 <strong>진단 → 사업계획서 초안 → 현지 실행 준비</strong>까지 이어집니다.
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

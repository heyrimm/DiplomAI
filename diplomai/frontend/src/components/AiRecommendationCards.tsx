"use client";

import { useEffect, useState } from "react";
import type { Recommendation } from "@/types";
import CitedText from "@/components/CitedText";

interface Props {
  recommendations: Recommendation[];
  loading: boolean;
  onGenerate: () => void;
  onSelectForPlan?: (index: number) => void;
  countryName: string;
}

const PRIORITY_TAG: Record<string, string> = {
  high:   "high",
  medium: "medium",
  low:    "",
};

const PRIORITY_LABEL: Record<string, string> = {
  high:   "우선순위 높음",
  medium: "우선순위 중간",
  low:    "우선순위 낮음",
};

/* 사업 분야(섹터) → Unsplash 검색 키워드 매핑 */
const SECTOR_QUERY: Record<string, string> = {
  "교육":            "school classroom children learning",
  "보건":            "health clinic medical care",
  "농업·농촌개발":   "agriculture farming rural field",
  "농림수산":        "agriculture farming fishery",
  "환경":            "environment nature green landscape",
  "기술·환경·에너지": "solar energy renewable technology",
  "산업·에너지":     "energy power infrastructure",
  "물·위생":         "clean water well sanitation",
  "물·위생·보건":    "clean water sanitation",
  "거버넌스":        "government office public administration",
  "공공행정":        "government city administration",
  "긴급구호":        "humanitarian aid relief",
  "젠더":            "women empowerment community",
  "공공외교":        "cultural exchange diplomacy people",
};

function sectorQuery(sector: string): string {
  if (SECTOR_QUERY[sector]) return SECTOR_QUERY[sector];
  // 부분 일치 fallback
  const hit = Object.keys(SECTOR_QUERY).find((k) => sector.includes(k) || k.includes(sector));
  return hit ? SECTOR_QUERY[hit] : `${sector} development`;
}

/** 카드 상단 원형 이미지 — 사업 분야 관련 Unsplash 사진 */
function RecThumb({ sector }: { sector: string }) {
  const [img, setImg] = useState<{ url: string; alt: string; author: string; author_url: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const q = sectorQuery(sector);
    fetch(`/api/image?q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && d.url) setImg(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [sector]);

  return (
    <span className={`rec-thumb${img ? " loaded" : ""}`}>
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.url} alt={img.alt} title={`Photo: ${img.author} / Unsplash`} loading="lazy" />
      )}
    </span>
  );
}

function RecCard({ rec, onSelectForPlan }: { rec: Recommendation; onSelectForPlan?: () => void }) {
  const tagCls = PRIORITY_TAG[rec.priority] ?? "";
  const isDiplomacy = rec.type === "diplomacy";

  return (
    <div className="rec-card">
      <RecThumb sector={rec.sector} />
      <div className="rec-card-head">
        <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
          {isDiplomacy && (
            <span style={{
              fontSize: 10.5, padding: "2px 7px", borderRadius: 4, flexShrink: 0,
              background: "rgba(16,185,129,.12)", color: "#059669", fontWeight: 700,
            }}>공공외교</span>
          )}
          <p className="rec-card-title" style={{ margin: 0 }}>{rec.title}</p>
        </div>
        <span className={`badge ${tagCls === "high" ? "badge-blue" : "badge-neutral"}`}
          style={{ flexShrink: 0 }}>
          {PRIORITY_LABEL[rec.priority] ?? rec.priority}
        </span>
      </div>

      <div className="rec-tags">
        <span className="rec-tag">📂 {rec.sector}</span>
        <span className="rec-tag">💰 {rec.budget_estimate}</span>
        {rec.sdg?.map((s) => (
          <span key={s} className="rec-tag sdg">{s}</span>
        ))}
        <span className="rec-tag">📅 {rec.duration}</span>
      </div>

      <div>
        <p className="rec-section-label">추천 이유</p>
        <p className="rec-body"><CitedText text={rec.rationale} /></p>
      </div>
      <div>
        <p className="rec-section-label">기대 효과</p>
        <p className="rec-body">{rec.expected_impact}</p>
      </div>
      {rec.data_citation && (
        <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>
          출처: {rec.data_citation}
        </p>
      )}
      {onSelectForPlan && (
        <button
          className="btn-ghost btn-sm"
          onClick={onSelectForPlan}
          style={{ marginTop: 10, alignSelf: "flex-start" }}
        >
          ✎ 이 사업으로 계획서 생성 →
        </button>
      )}
    </div>
  );
}

export default function AiRecommendationCards({
  recommendations, loading, onGenerate, onSelectForPlan, countryName,
}: Props) {
  return (
    <div className="ai-section">
      <div className="ai-section-head">
        <div>
          <p className="ai-section-title">AI 사업 추천</p>
          <p className="ai-section-sub">
            ODA 재원과 공공 지원 채널·무역 정보를 종합해 {countryName}에 최적의 사업 아이템을 추천합니다
          </p>
        </div>
        <button className="btn-fab" onClick={onGenerate} disabled={loading}>
          {loading ? <span className="spinner white" /> : "✨"}
          {loading ? "분석 중..." : "AI 추천 생성"}
        </button>
      </div>

      {recommendations.length === 0 && !loading && (
        <div className="ai-empty">
          <p>
            &quot;AI 추천 생성&quot; 버튼을 눌러
            <br />
            {countryName} 맞춤 ODA 사업을 추천받으세요.
          </p>
        </div>
      )}

      {loading && (
        <div className="ai-empty">
          <div className="ai-empty-icon" style={{ border: 0, background: "transparent" }}>
            <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          </div>
          <p>AI가 데이터를 분석하는 중...</p>
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <div className="rec-grid">
          {recommendations.map((rec, i) => (
            <RecCard
              key={i}
              rec={rec}
              onSelectForPlan={onSelectForPlan ? () => onSelectForPlan(i) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

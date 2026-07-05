"use client";

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

function RecCard({ rec, onSelectForPlan }: { rec: Recommendation; onSelectForPlan?: () => void }) {
  const tagCls = PRIORITY_TAG[rec.priority] ?? "";
  const isDiplomacy = rec.type === "diplomacy";

  return (
    <div className="rec-card">
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
            Claude AI가 {countryName} 데이터를 분석하여 맞춤 ODA 사업을 추천합니다
          </p>
        </div>
        <button className="btn-accent" onClick={onGenerate} disabled={loading}>
          {loading ? <span className="spinner white" /> : "✨"}
          {loading ? "분석 중..." : "AI 추천 생성"}
        </button>
      </div>

      {recommendations.length === 0 && !loading && (
        <div className="ai-empty">
          <div className="ai-empty-icon">🤖</div>
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
          <p>Claude AI가 데이터를 분석하는 중...</p>
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

"use client";

import { useState } from "react";
import type {
  Country, OdaBudgetResponse, OdaGapsResponse,
  DiplomacyResponse, Recommendation,
} from "@/types";

interface Props {
  country: Country;
  budget: OdaBudgetResponse | null;
  gaps: OdaGapsResponse | null;
  diplomacy: DiplomacyResponse | null;
  recommendations: Recommendation[];
}

const SECTIONS = [
  { id: "overview",  label: "국가 개요" },
  { id: "oda",       label: "ODA 현황" },
  { id: "gaps",      label: "사각지대 분석" },
  { id: "diplomacy", label: "공공외교 현황" },
  { id: "recommend", label: "AI 사업 추천" },
];

export default function ReportTab({ country, budget, gaps, diplomacy, recommendations }: Props) {
  const [selected, setSelected]   = useState<Set<string>>(new Set(SECTIONS.map((s) => s.id)));
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 1200);
  };

  const total = budget?.sectors.reduce((s, i) => s + i.budget, 0) ?? 0;
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="stack">
      {/* Section selector */}
      <div className="card">
        <div className="card-body">
          <p className="card-title" style={{ marginBottom: 14 }}>보고서 구성 선택</p>
          <div className="section-toggle-row">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`section-toggle ${selected.has(s.id) ? "on" : "off"}`}
                onClick={() => toggle(s.id)}
              >
                {selected.has(s.id) ? "✓ " : ""}{s.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
            <button
              className="btn-accent"
              onClick={handleGenerate}
              disabled={generating || selected.size === 0}
            >
              {generating ? <span className="spinner white" /> : "⊟"}
              보고서 생성
            </button>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {selected.size}개 섹션 선택됨
            </span>
          </div>
        </div>
      </div>

      {/* Generated report preview */}
      {generated && (
        <div className="report-preview">
          <div className="report-preview-head">
            <div>
              <p className="report-eyebrow">DiplomAI 분석 보고서</p>
              <h2 className="report-title">{country.name} ODA·공공외교 종합 분석</h2>
              <p className="report-meta">
                작성일: {today} · 출처: KOICA 공개데이터, KF 통계센터, 외교부 ODA 백서 2023
              </p>
            </div>
            <button
              className="btn-ghost btn-sm"
              onClick={() => window.print()}
              style={{ flexShrink: 0 }}
            >
              🖨 인쇄
            </button>
          </div>

          <div className="report-body">
            {selected.has("overview") && (
              <div className="report-section">
                <p className="report-section-title">1. 국가 개요</p>
                <div className="grid-2" style={{ gap: 8 }}>
                  <Row label="국가명"     value={`${country.name} (${country.name_en})`} />
                  <Row label="지역"       value={country.region} />
                  <Row label="소득 분류"  value={country.income_level} />
                  <Row label="인구"       value={`${(country.population / 1_000_000).toFixed(1)}백만 명`} />
                  <Row label="1인당 GDP"  value={`$${country.gdp_per_capita.toLocaleString()}`} />
                  <Row label="HDI"        value={`${country.hdi} (${country.hdi >= 0.7 ? "고" : country.hdi >= 0.55 ? "중" : "저"}개발국)`} />
                </div>
              </div>
            )}

            {selected.has("oda") && budget && (
              <div className="report-section">
                <p className="report-section-title">2. ODA 현황 (KOICA 공개데이터 2023)</p>
                <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.6 }}>
                  {country.name}에 대한 KOICA의 2023년 총 ODA 예산은{" "}
                  <strong>{Math.round(total).toLocaleString()}억원</strong>입니다.
                </p>
                <table style={{ width: "100%", fontSize: 13.5, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                      <th style={{ textAlign: "left", padding: "6px 0", color: "var(--muted)", fontWeight: 500 }}>분야</th>
                      <th style={{ textAlign: "right", padding: "6px 0", color: "var(--muted)", fontWeight: 500 }}>예산(억원)</th>
                      <th style={{ textAlign: "right", padding: "6px 0", color: "var(--muted)", fontWeight: 500 }}>사업 수</th>
                      <th style={{ textAlign: "right", padding: "6px 0", color: "var(--muted)", fontWeight: 500 }}>비중</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.sectors.map((s) => (
                      <tr key={s.sector} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "8px 0", color: "var(--ink-soft)" }}>{s.sector}</td>
                        <td style={{ padding: "8px 0", textAlign: "right", color: "var(--ink)" }}>{s.budget}</td>
                        <td style={{ padding: "8px 0", textAlign: "right", color: "var(--muted)" }}>{s.projects}건</td>
                        <td style={{ padding: "8px 0", textAlign: "right", color: "var(--muted)" }}>
                          {total > 0 ? ((s.budget / total) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selected.has("gaps") && gaps && (
              <div className="report-section">
                <p className="report-section-title">3. ODA 사각지대 분석</p>
                {gaps.gaps.length === 0 ? (
                  <p style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>현재 감지된 사각지대 분야 없음.</p>
                ) : (
                  <>
                    <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 10, lineHeight: 1.6 }}>
                      유사국 지역 평균 대비 {gaps.threshold_percent}% 이상 낮은 분야를 사각지대로 분류합니다.
                    </p>
                    <div className="stack">
                      {gaps.gaps.map((g) => (
                        <div key={g.sector} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "9px 14px", borderRadius: "var(--r-md)",
                          background: "var(--warning-soft)", fontSize: 13.5,
                        }}>
                          <span style={{ fontWeight: 600, color: "var(--warning)" }}>{g.sector}</span>
                          <span style={{ color: "#92400e" }}>
                            현재 {g.current_budget}억원 (지역평균 {g.regional_average}억원 대비 {Math.round(g.ratio * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {selected.has("diplomacy") && diplomacy && (
              <div className="report-section">
                <p className="report-section-title">4. 공공외교 현황 (KF 통계센터 2023)</p>
                <div className="grid-3" style={{ gap: 8 }}>
                  <div style={{ textAlign: "center", padding: 12, background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
                    <p style={{ fontSize: 11.5, color: "var(--muted)" }}>KF 공공외교 지수</p>
                    <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{diplomacy.kf_index}/100</p>
                  </div>
                  <div style={{ textAlign: "center", padding: 12, background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
                    <p style={{ fontSize: 11.5, color: "var(--muted)" }}>한국어 학습자</p>
                    <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{diplomacy.korean_learners.toLocaleString()}</p>
                  </div>
                  <div style={{ textAlign: "center", padding: 12, background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
                    <p style={{ fontSize: 11.5, color: "var(--muted)" }}>한국 관광객</p>
                    <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{(diplomacy.tourists / 1000).toFixed(0)}K</p>
                  </div>
                </div>
                <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 12, lineHeight: 1.6 }}>
                  {diplomacy.ai_insight}
                </p>
              </div>
            )}

            {selected.has("recommend") && (
              <div className="report-section">
                <p className="report-section-title">5. AI 신규 사업 추천</p>
                {recommendations.length === 0 ? (
                  <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
                    AI 추천을 먼저 생성해주세요 (ODA 분석 탭 → AI 추천 생성).
                  </p>
                ) : (
                  <div className="stack">
                    {recommendations.map((r, i) => (
                      <div key={i} style={{ padding: "14px", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <p style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13.5 }}>{i + 1}. {r.title}</p>
                          <span style={{ fontSize: 12.5, color: "var(--muted)", flexShrink: 0 }}>{r.budget_estimate} · {r.duration}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 5, lineHeight: 1.55 }}>{r.rationale}</p>
                        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>기대 효과: {r.expected_impact}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-row">
      <span className="report-row-key">{label}</span>
      <span className="report-row-val">{value}</span>
    </div>
  );
}

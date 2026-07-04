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
  const [selected, setSelected]       = useState<Set<string>>(new Set(SECTIONS.map((s) => s.id)));
  const [generating, setGenerating]   = useState(false);
  const [generated, setGenerated]     = useState(false);
  const [executiveSummary, setExec]   = useState<string>("");
  const [aiError, setAiError]         = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleGenerate = async () => {
    setGenerating(true);
    setAiError(null);
    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country_id: country.id, sections: Array.from(selected) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail || "보고서 생성 실패");
      }
      const data = await res.json() as { executive_summary?: string };
      setExec(data.executive_summary ?? "");
      setGenerated(true);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "보고서 생성 실패");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const lines: string[] = [
      `# ${country.name} (${country.name_en}) ODA·공공외교 종합 분석`,
      ``,
      `**작성일:** ${today}  `,
      `**출처:** KOICA 공개데이터, KF 통계센터, 외교부 ODA 백서 2023`,
      ``,
    ];
    if (executiveSummary) {
      lines.push(`## 종합 전략 분석 (AI)`, ``, executiveSummary, ``, `*생성: Claude AI (claude-haiku-4-5) · KOICA 공개데이터 기반*`, ``);
    }
    if (selected.has("overview")) {
      lines.push(`## 1. 국가 개요`, ``, `| 항목 | 값 |`, `|------|------|`,
        `| 국가명 | ${country.name} (${country.name_en}) |`,
        `| 지역 | ${country.region} |`,
        `| 소득 분류 | ${country.income_level} |`,
        `| 인구 | ${(country.population / 1_000_000).toFixed(1)}백만 명 |`,
        `| 1인당 GDP | $${country.gdp_per_capita.toLocaleString()} |`,
        `| HDI | ${country.hdi} |`, ``);
    }
    if (selected.has("oda") && budget) {
      lines.push(`## 2. ODA 현황 (KOICA ${budget.year}년)`, ``,
        `총 예산: **${Math.round(total).toLocaleString()}억원**`, ``,
        `| 분야 | 예산(억원) | 사업 수 | 비중 |`, `|------|-----------|---------|------|`);
      budget.sectors.forEach(s => {
        const pct = total > 0 ? ((s.budget / total) * 100).toFixed(1) : "0";
        lines.push(`| ${s.sector} | ${s.budget} | ${s.projects}건 | ${pct}% |`);
      });
      lines.push(``);
    }
    if (selected.has("gaps") && gaps && gaps.gaps.length > 0) {
      lines.push(`## 3. ODA 사각지대 분석`, ``,
        `지역 평균 대비 ${gaps.threshold_percent}% 이상 낮은 분야 (KOICA CSV 기반 실계산):`, ``);
      gaps.gaps.forEach(g => {
        lines.push(`- **${g.sector}**: 현재 ${g.current_budget}억원 (지역평균 ${g.regional_average}억원 대비 ${Math.round(g.ratio * 100)}%)`);
      });
      lines.push(``);
    }
    if (selected.has("diplomacy") && diplomacy) {
      lines.push(`## 4. 공공외교 현황`, ``,
        `- 공공외교 지수: **${diplomacy.kf_index}/100**`);
      if (diplomacy.korean_learners != null) lines.push(`- 한국어 학습자: ${diplomacy.korean_learners.toLocaleString()}명`);
      if (diplomacy.diaspora_count != null)  lines.push(`- 재외동포: ${diplomacy.diaspora_count.toLocaleString()}명`);
      lines.push(``);
    }
    if (selected.has("recommend") && recommendations.length > 0) {
      lines.push(`## 5. AI 신규 사업 추천`, ``);
      recommendations.forEach((r, i) => {
        lines.push(`### ${i + 1}. ${r.title}`,
          `- **유형:** ${r.type === "diplomacy" ? "공공외교" : "ODA"}`,
          `- **분야:** ${r.sector} / **예산:** ${r.budget_estimate} / **기간:** ${r.duration}`,
          `- **추진 근거:** ${r.rationale}`,
          `- **기대 효과:** ${r.expected_impact}`);
        if (r.data_citation) lines.push(`- **데이터:** ${r.data_citation}`);
        lines.push(``);
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown; charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `DiplomAI_${country.id}_report.md`;
    a.click();
    URL.revokeObjectURL(url);
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
              {generating ? "AI 분석 중…" : "보고서 생성"}
            </button>
            <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {selected.size}개 섹션 선택됨
            </span>
          </div>
          {aiError && (
            <div className="error-banner" style={{ marginTop: 10 }}>
              <span>⚠</span><span>{aiError}</span>
            </div>
          )}
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
              onClick={handleDownloadMarkdown}
              style={{ flexShrink: 0 }}
            >
              ↓ MD 저장
            </button>
          </div>

          {executiveSummary && (
            <div style={{
              margin: "0 24px 0",
              padding: "16px 18px",
              background: "rgba(29,78,216,.04)",
              borderRadius: "var(--r-md)",
              border: "1px solid rgba(29,78,216,.15)",
            }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
                종합 전략 분석 (AI)
              </p>
              <p style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.75 }}>{executiveSummary}</p>
              <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 8 }}>
                생성: Claude AI (claude-haiku-4-5) · KOICA 공개데이터 기반
              </p>
            </div>
          )}

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
                <p className="report-section-title">4. 공공외교 현황 (세종학당재단 · 외교부 재외동포현황 2023)</p>
                <div className="grid-3" style={{ gap: 8 }}>
                  <div style={{ textAlign: "center", padding: 12, background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
                    <p style={{ fontSize: 11.5, color: "var(--muted)" }}>공공외교 지수</p>
                    <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{diplomacy.kf_index}/100</p>
                  </div>
                  <div style={{ textAlign: "center", padding: 12, background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
                    <p style={{ fontSize: 11.5, color: "var(--muted)" }}>한국어 학습자</p>
                    <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{diplomacy.korean_learners?.toLocaleString() ?? "—"}</p>
                  </div>
                  <div style={{ textAlign: "center", padding: 12, background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
                    <p style={{ fontSize: 11.5, color: "var(--muted)" }}>한국 관광객</p>
                    <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{diplomacy.tourists != null ? `${(diplomacy.tourists / 1000).toFixed(0)}K` : "—"}</p>
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
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {r.type === "diplomacy" && (
                              <span style={{ fontSize: 10.5, padding: "2px 6px", background: "rgba(16,185,129,.12)", color: "#059669", borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>공공외교</span>
                            )}
                            <p style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13.5, margin: 0 }}>{i + 1}. {r.title}</p>
                          </div>
                          <span style={{ fontSize: 12.5, color: "var(--muted)", flexShrink: 0 }}>{r.budget_estimate} · {r.duration}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 5, lineHeight: 1.55 }}>{r.rationale}</p>
                        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>기대 효과: {r.expected_impact}</p>
                        {r.data_citation && <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>출처: {r.data_citation}</p>}
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

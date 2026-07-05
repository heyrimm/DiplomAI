"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import CitedText, { stripCites } from "@/components/CitedText";
import type {
  Country, OdaBudgetResponse, OdaGapsResponse,
  DiplomacyResponse, Recommendation, ProjectPlan,
} from "@/types";

interface Props {
  country: Country;
  budget: OdaBudgetResponse | null;
  gaps: OdaGapsResponse | null;
  diplomacy: DiplomacyResponse | null;
  recommendations: Recommendation[];
  planBaseIndex?: number;
}

const PLAN_STEPS = [
  "공공데이터 수집·통합 — KOICA·KF·세종학당·재외동포",
  "사각지대·공공외교 공백 분석 — 지역 평균 대비 실계산",
  "여행경보·리스크 반영 — 외교부 API",
  "사업계획서 초안 작성 — 배경·목표·활동·예산·KPI·리스크",
];

const SECTIONS = [
  { id: "overview",  label: "국가 개요" },
  { id: "oda",       label: "ODA 현황" },
  { id: "gaps",      label: "사각지대 분석" },
  { id: "diplomacy", label: "공공외교 현황" },
  { id: "recommend", label: "AI 사업 추천" },
];

const DATA_SOURCES_LINE =
  "KOICA 공공데이터(ODA 실적·사업분야별 통계), 외교부 재외동포현황(2021), 세종학당재단(문체부 산하) 수강생 현황(2025), 외교부 여행경보 API";

export default function ReportTab({
  country, budget, gaps, diplomacy, recommendations, planBaseIndex = -1,
}: Props) {
  const [docMode, setDocMode] = useState<"report" | "plan">("report");

  // ── 분석 보고서 상태
  const [selected, setSelected]       = useState<Set<string>>(new Set(SECTIONS.map((s) => s.id)));
  const [generating, setGenerating]   = useState(false);
  const [generated, setGenerated]     = useState(false);
  const [executiveSummary, setExec]   = useState<string>("");
  const [aiError, setAiError]         = useState<string | null>(null);

  // ── 사업계획서 상태
  const [planBase, setPlanBase]           = useState<number>(-1); // -1 = 국가 종합
  const [plan, setPlan]                   = useState<ProjectPlan | null>(null);
  const [planGenerating, setPlanGenerating] = useState(false);
  const [planError, setPlanError]         = useState<string | null>(null);
  const [planStep, setPlanStep]           = useState(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 추천 카드 "이 사업으로 계획서 생성" → 계획서 모드로 자동 전환 + 기반 사업 선택
  useEffect(() => {
    if (planBaseIndex >= 0 && planBaseIndex < recommendations.length) {
      setDocMode("plan");
      setPlanBase(planBaseIndex);
    }
  }, [planBaseIndex, recommendations.length]);

  useEffect(() => () => { if (stepTimer.current) clearInterval(stepTimer.current); }, []);

  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleGenerate = async () => {
    setGenerating(true);
    setAiError(null);
    try {
      const data = await api.generateReport({
        country_id: country.id,
        sections: Array.from(selected),
        mode: "summary",
      });
      setExec(data.executive_summary ?? "");
      setGenerated(true);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "보고서 생성 실패");
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePlan = async () => {
    setPlanGenerating(true);
    setPlanError(null);
    setPlanStep(0);
    stepTimer.current = setInterval(
      () => setPlanStep((s) => Math.min(s + 1, PLAN_STEPS.length - 1)),
      4000,
    );
    try {
      const data = await api.generateReport({
        country_id: country.id,
        sections: [],
        mode: "plan",
        base_recommendation: planBase >= 0 ? recommendations[planBase] : null,
      });
      if (!data.plan) throw new Error("계획서 데이터가 비어 있습니다.");
      setPlan(data.plan);
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "계획서 생성 실패");
    } finally {
      if (stepTimer.current) { clearInterval(stepTimer.current); stepTimer.current = null; }
      setPlanGenerating(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const lines: string[] = [
      `# ${country.name} (${country.name_en}) ODA·공공외교 종합 분석`,
      ``,
      `**작성일:** ${today}  `,
      `**출처:** ${DATA_SOURCES_LINE}`,
      ``,
    ];
    if (executiveSummary) {
      lines.push(`## 종합 전략 분석 (AI)`, ``, executiveSummary, ``, `*생성: Claude AI · KOICA 공공데이터 기반*`, ``);
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
        `- 공공외교 지수: **${diplomacy.kf_index}/100** *(세종학당 수강생·재외동포·재외공관 수 log 정규화 합산, 자체 산출 지수)*`);
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
          `- **추진 근거:** ${stripCites(r.rationale)}`,
          `- **기대 효과:** ${r.expected_impact}`);
        if (r.data_citation) lines.push(`- **데이터:** ${r.data_citation}`);
        lines.push(``);
      });
    }
    downloadMd(lines, `DiplomAI_${country.id}_report.md`);
  };

  const handleDownloadPlanMarkdown = () => {
    if (!plan) return;
    const lines: string[] = [
      `# 사업계획서 초안: ${plan.title}`,
      ``,
      `**대상국:** ${country.name} (${country.name_en})  `,
      `**유형:** ${plan.type === "diplomacy" ? "공공외교" : "ODA"}${plan.duration ? ` · 기간 ${plan.duration}` : ""}  `,
      `**작성일:** ${today} · DiplomAI 자동 생성 초안 (Claude AI · 공공데이터 기반)`,
      ``,
      `## 1. 추진 배경`, ``, stripCites(plan.background), ``,
      `## 2. 사업 목표`, ``,
      ...plan.objectives.map((o, i) => `${i + 1}. ${stripCites(o)}`), ``,
      `## 3. 대상·수혜자`, ``, stripCites(plan.target_beneficiaries), ``,
      `## 4. 활동 내용`, ``,
      ...plan.activities.flatMap((a, i) => [`### 4-${i + 1}. ${a.name}`, stripCites(a.description), ``]),
      `## 5. 예산 계획`, ``, `| 항목 | 금액 |`, `|------|------|`,
      ...plan.budget_plan.map(b => `| ${b.item} | ${b.amount} |`), ``,
      `## 6. 성과지표 (KPI)`, ``, `| 지표 | 목표치 |`, `|------|--------|`,
      ...plan.kpis.map(k => `| ${k.indicator} | ${k.target} |`), ``,
      `## 7. 리스크 및 대응`, ``,
      ...plan.risks.map(r => `- **${stripCites(r.risk)}** → ${stripCites(r.mitigation)}`), ``,
    ];
    if (plan.data_citations?.length) {
      lines.push(`## 데이터 출처`, ``, ...plan.data_citations.map(c => `- ${c}`), ``);
    }
    lines.push(`---`, `*본 문서는 DiplomAI가 공공데이터(${DATA_SOURCES_LINE})를 근거로 생성한 초안이며, 실제 사업 추진 전 담당자 검토가 필요합니다.*`);
    downloadMd(lines, `DiplomAI_${country.id}_사업계획서_초안.md`);
  };

  const downloadMd = (lines: string[], filename: string) => {
    const blob = new Blob([lines.join("\n")], { type: "text/markdown; charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = budget?.sectors.reduce((s, i) => s + i.budget, 0) ?? 0;
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="stack">
      {/* Mode toggle */}
      <div className="card">
        <div className="card-body" style={{ paddingBottom: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`section-toggle ${docMode === "report" ? "on" : "off"}`}
              onClick={() => setDocMode("report")}
            >
              분석 보고서
            </button>
            <button
              className={`section-toggle ${docMode === "plan" ? "on" : "off"}`}
              onClick={() => setDocMode("plan")}
            >
              사업계획서 초안 <span style={{ fontSize: 10, fontWeight: 700, opacity: .8 }}>NEW</span>
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>
            {docMode === "report"
              ? "국가 데이터를 종합한 분석 보고서를 생성합니다."
              : "공공데이터·사각지대·여행경보를 근거로 배경-목표-활동-예산-KPI-리스크 구조의 사업계획서 초안을 AI가 작성합니다."}
          </p>
        </div>
      </div>

      {docMode === "report" ? (
        <>
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
                    작성일: {today} · 출처: KOICA 공공데이터 · 외교부 재외동포현황(2021) · 세종학당재단(문체부 산하) · 외교부 여행경보 API
                  </p>
                </div>
                <div className="no-print" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="btn-ghost btn-sm" onClick={() => window.print()}>
                    🖨 인쇄 / PDF
                  </button>
                  <button className="btn-ghost btn-sm" onClick={handleDownloadMarkdown}>
                    ↓ MD 저장
                  </button>
                </div>
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
                    생성: Claude AI · KOICA 공공데이터 기반
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
                    <p className="report-section-title">2. ODA 현황 (KOICA {budget.year}년)</p>
                    <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.6 }}>
                      {country.name}에 대한 KOICA의 {budget.year}년 총 ODA 예산은{" "}
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
                    <p className="report-section-title">4. 공공외교 현황 (세종학당재단(문체부 산하) 2025 · 외교부 재외동포현황 2021)</p>
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
                        <p style={{ fontSize: 11.5, color: "var(--muted)" }}>재외동포</p>
                        <p style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{diplomacy.diaspora_count?.toLocaleString() ?? "—"}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 12, lineHeight: 1.6 }}>
                      {diplomacy.ai_insight}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>
                      * 공공외교 지수: 세종학당 수강생·재외동포·재외공관 수를 log 정규화해 합산한 자체 산출 지수
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
                            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 5, lineHeight: 1.55 }}><CitedText text={r.rationale} /></p>
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
        </>
      ) : (
        <>
          {/* Plan base selector */}
          <div className="card">
            <div className="card-body">
              <p className="card-title" style={{ marginBottom: 6 }}>계획서 기반 선택</p>
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>
                AI 추천 사업 중 하나를 골라 구체화하거나, 국가 데이터 종합 기반으로 신규 작성합니다.
              </p>
              <div className="section-toggle-row">
                <button
                  className={`section-toggle ${planBase === -1 ? "on" : "off"}`}
                  onClick={() => setPlanBase(-1)}
                >
                  국가 종합 (신규 발굴)
                </button>
                {recommendations.map((r, i) => (
                  <button
                    key={i}
                    className={`section-toggle ${planBase === i ? "on" : "off"}`}
                    onClick={() => setPlanBase(i)}
                  >
                    {r.type === "diplomacy" ? "🌐 " : ""}{r.title}
                  </button>
                ))}
              </div>
              {recommendations.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--faint)", marginTop: 8 }}>
                  * AI 추천 탭에서 추천을 먼저 생성하면 추천 사업 기반 계획서도 작성할 수 있습니다.
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
                <button
                  className="btn-accent"
                  onClick={handleGeneratePlan}
                  disabled={planGenerating}
                >
                  {planGenerating ? <span className="spinner white" /> : "✎"}
                  {planGenerating ? "계획서 작성 중…" : "사업계획서 초안 생성"}
                </button>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  {planBase === -1 ? "국가 데이터 종합 기반" : `"${recommendations[planBase]?.title}" 구체화`}
                </span>
              </div>

              {/* 단계형 진행 표시 */}
              {planGenerating && (
                <div style={{
                  marginTop: 14, padding: "14px 16px",
                  background: "var(--surface-2)", borderRadius: "var(--r-md)",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  {PLAN_STEPS.map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5 }}>
                      {i < planStep ? (
                        <span style={{ color: "var(--success)", fontWeight: 700, width: 16, textAlign: "center", flexShrink: 0 }}>✓</span>
                      ) : i === planStep ? (
                        <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, flexShrink: 0, margin: "0 2px" }} />
                      ) : (
                        <span style={{ color: "var(--faint)", width: 16, textAlign: "center", flexShrink: 0 }}>○</span>
                      )}
                      <span style={{
                        color: i < planStep ? "var(--muted)" : i === planStep ? "var(--ink)" : "var(--faint)",
                        fontWeight: i === planStep ? 600 : 400,
                        textDecoration: i < planStep ? "line-through" : "none",
                      }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {planError && (
                <div className="error-banner" style={{ marginTop: 10 }}>
                  <span>⚠</span><span>{planError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Generated plan preview */}
          {plan && (
            <div className="report-preview">
              <div className="report-preview-head">
                <div>
                  <p className="report-eyebrow">
                    사업계획서 초안 · {plan.type === "diplomacy" ? "공공외교" : "ODA"}
                    {plan.duration ? ` · ${plan.duration}` : ""}
                  </p>
                  <h2 className="report-title">{plan.title}</h2>
                  <p className="report-meta">
                    대상국: {country.name} · 작성일: {today} · Claude AI 자동 생성 초안 (공공데이터 기반)
                  </p>
                </div>
                <div className="no-print" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="btn-ghost btn-sm" onClick={() => window.print()}>
                    🖨 인쇄 / PDF
                  </button>
                  <button className="btn-ghost btn-sm" onClick={handleDownloadPlanMarkdown}>
                    ↓ MD 저장
                  </button>
                </div>
              </div>

              <div className="report-body">
                <div className="report-section">
                  <p className="report-section-title">1. 추진 배경</p>
                  <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.7 }}><CitedText text={plan.background} /></p>
                </div>

                <div className="report-section">
                  <p className="report-section-title">2. 사업 목표</p>
                  <ol style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.7, paddingLeft: 20 }}>
                    {plan.objectives.map((o, i) => <li key={i}><CitedText text={o} /></li>)}
                  </ol>
                </div>

                <div className="report-section">
                  <p className="report-section-title">3. 대상·수혜자</p>
                  <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.7 }}><CitedText text={plan.target_beneficiaries} /></p>
                </div>

                <div className="report-section">
                  <p className="report-section-title">4. 활동 내용</p>
                  <div className="stack">
                    {plan.activities.map((a, i) => (
                      <div key={i} style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                        <p style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{i + 1}. {a.name}</p>
                        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.6 }}><CitedText text={a.description} /></p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="report-section">
                  <p className="report-section-title">5. 예산 계획</p>
                  <table style={{ width: "100%", fontSize: 13.5, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        <th style={{ textAlign: "left", padding: "6px 0", color: "var(--muted)", fontWeight: 500 }}>항목</th>
                        <th style={{ textAlign: "right", padding: "6px 0", color: "var(--muted)", fontWeight: 500 }}>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.budget_plan.map((b, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ padding: "8px 0", color: "var(--ink-soft)" }}>{b.item}</td>
                          <td style={{ padding: "8px 0", textAlign: "right", color: "var(--ink)" }}>{b.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="report-section">
                  <p className="report-section-title">6. 성과지표 (KPI)</p>
                  <table style={{ width: "100%", fontSize: 13.5, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--line)" }}>
                        <th style={{ textAlign: "left", padding: "6px 0", color: "var(--muted)", fontWeight: 500 }}>지표</th>
                        <th style={{ textAlign: "right", padding: "6px 0", color: "var(--muted)", fontWeight: 500 }}>목표치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.kpis.map((k, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ padding: "8px 0", color: "var(--ink-soft)" }}>{k.indicator}</td>
                          <td style={{ padding: "8px 0", textAlign: "right", color: "var(--ink)" }}>{k.target}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="report-section">
                  <p className="report-section-title">7. 리스크 및 대응</p>
                  <div className="stack">
                    {plan.risks.map((r, i) => (
                      <div key={i} style={{
                        padding: "10px 14px", borderRadius: "var(--r-md)",
                        background: "var(--warning-soft)", fontSize: 13,
                      }}>
                        <span style={{ fontWeight: 600, color: "var(--warning)" }}><CitedText text={r.risk} /></span>
                        <span style={{ color: "#92400e" }}> → <CitedText text={r.mitigation} /></span>
                      </div>
                    ))}
                  </div>
                </div>

                {plan.data_citations && plan.data_citations.length > 0 && (
                  <div className="report-section">
                    <p className="report-section-title">데이터 출처</p>
                    <ul style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7, paddingLeft: 18 }}>
                      {plan.data_citations.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                <p style={{ fontSize: 11, color: "var(--faint)", padding: "0 0 8px" }}>
                  * 본 문서는 AI가 공공데이터를 근거로 생성한 초안이며, 실제 사업 추진 전 담당자 검토가 필요합니다.
                </p>
              </div>
            </div>
          )}
        </>
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

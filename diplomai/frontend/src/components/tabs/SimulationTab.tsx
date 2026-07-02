"use client";

import { useEffect, useState, useMemo } from "react";

// ── 계수 (backend와 동일 값 — 실시간 계산용) ──
const HDI_COEFF: Record<string, number> = {
  "교육":           0.000120,
  "보건":           0.000100,
  "농림수산":       0.000060,
  "기술·환경·에너지": 0.000050,
  "공공행정":       0.000040,
  "긴급구호":       0.000010,
  "기타":           0.000020,
};
const BENEFICIARY_COEFF: Record<string, number> = {
  "교육":           500,
  "보건":           2000,
  "농림수산":       300,
  "기술·환경·에너지": 400,
  "공공행정":       200,
  "긴급구호":       5000,
  "기타":           150,
};
const SECTOR_SDG: Record<string, string[]> = {
  "교육":           ["SDG 4"],
  "보건":           ["SDG 3", "SDG 6"],
  "농림수산":       ["SDG 2", "SDG 15"],
  "기술·환경·에너지": ["SDG 7", "SDG 9", "SDG 13"],
  "공공행정":       ["SDG 16", "SDG 1"],
  "긴급구호":       ["SDG 1", "SDG 11"],
  "기타":           ["SDG 5", "SDG 10"],
};

interface BaseSector { sector: string; budget: number; projects: number; }
interface SuccessCase { name: string; detail: string; country: string; sdg: string; }
interface BaseData {
  country_id: string;
  total_억원: number;
  year: number;
  hdi: number;
  population: number;
  gdp_per_capita: number;
  sectors: BaseSector[];
  success_cases: SuccessCase[];
  source: string;
}
interface AiAnalysis {
  strategy: string;
  expected_outcomes: string;
  risks: string;
  case_study: string;
  overall_score: number;
  recommendation: string;
}

interface Props { countryId: string | null; }

// 슬라이더 색상: 양수=green, 음수=red, 0=neutral
function sliderColor(v: number) {
  if (v > 5) return "var(--success)";
  if (v < -5) return "#ef4444";
  return "var(--accent)";
}

function pctLabel(v: number) {
  return v === 0 ? "기준" : `${v > 0 ? "+" : ""}${v}%`;
}

export default function SimulationTab({ countryId }: Props) {
  const [base, setBase]       = useState<BaseData | null>(null);
  const [loadingBase, setLB]  = useState(false);
  // 섹터별 슬라이더 값 (% 조정, -50 ~ +50)
  const [sliders, setSliders] = useState<Record<string, number>>({});
  const [aiResult, setAiResult]   = useState<AiAnalysis | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError]     = useState<string | null>(null);

  // 국가 바뀌면 base 데이터 재로드, 슬라이더 초기화
  useEffect(() => {
    if (!countryId) { setBase(null); return; }
    setLB(true);
    setSliders({});
    setAiResult(null);
    setAiError(null);
    fetch(`/api/simulation/${encodeURIComponent(countryId)}/base`)
      .then(r => r.json())
      .then((d: BaseData) => { setBase(d); setLB(false); })
      .catch(() => setLB(false));
  }, [countryId]);

  // 슬라이더 변경 핸들러
  const setSlider = (sector: string, val: number) =>
    setSliders(prev => ({ ...prev, [sector]: val }));

  // ── 실시간 계산 ──
  const calc = useMemo(() => {
    if (!base) return null;
    let deltaHdi = 0;
    let deltaBeneficiaries = 0;
    const affectedSdg = new Set<string>();

    for (const s of base.sectors) {
      const pct  = sliders[s.sector] ?? 0;
      const delta = s.budget * (pct / 100);   // 억원 변화량
      if (delta === 0) continue;

      deltaHdi          += delta * (HDI_COEFF[s.sector] ?? 0);
      deltaBeneficiaries += Math.round(delta * (BENEFICIARY_COEFF[s.sector] ?? 0));
      (SECTOR_SDG[s.sector] ?? []).forEach(g => affectedSdg.add(g));
    }

    // SDG 기여 점수: 영향 SDG 수 × 5점, 최대 50점
    const deltaSdgScore = affectedSdg.size * 5 * (deltaHdi >= 0 ? 1 : -1);

    return { deltaHdi, deltaBeneficiaries, deltaSdgScore, affectedSdg: [...affectedSdg].sort() };
  }, [base, sliders]);

  // ── AI 시나리오 분석 ──
  const handleAiAnalyze = async () => {
    if (!base || !calc) return;
    setLoadingAI(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch("/api/simulation/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_id:           base.country_id,
          adjustments:          sliders,
          delta_hdi:            calc.deltaHdi,
          delta_beneficiaries:  calc.deltaBeneficiaries,
          delta_sdg_score:      calc.deltaSdgScore,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "AI 분석 실패");
      }
      const data = await res.json();
      setAiResult(data.analysis);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI 분석 실패");
    } finally {
      setLoadingAI(false);
    }
  };

  // ── 빈 상태 ──
  if (!countryId) {
    return (
      <div className="empty-state">국가를 먼저 선택하세요</div>
    );
  }
  if (loadingBase) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        <span>시뮬레이션 데이터 로딩 중…</span>
      </div>
    );
  }
  if (!base) {
    return <div className="empty-state">데이터를 불러올 수 없습니다</div>;
  }

  const hasAdjustment = Object.values(sliders).some(v => v !== 0);

  return (
    <div className="stack">

      {/* ── 상단 설명 ── */}
      <div style={{
        padding: "14px 18px",
        background: "var(--accent-soft)",
        borderRadius: "var(--r-lg)",
        border: "1px solid rgba(29,78,216,.15)",
        fontSize: 13.5,
        color: "var(--accent-strong)",
        lineHeight: 1.6,
      }}>
        <strong>ODA 예산 재배분 시뮬레이터</strong> — 섹터별 슬라이더로 예산을 조정하면
        HDI 변화량·수혜 인구·SDG 기여가 실시간으로 추정됩니다.
        <span style={{ opacity: .7 }}> (KOICA 협력국 통합 개발 지표 기반 회귀 추정)</span>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>

        {/* ── 슬라이더 패널 ── */}
        <div className="card">
          <div className="card-body">
            <div className="card-head">
              <div>
                <p className="card-title">섹터별 예산 조정</p>
                <p className="card-meta">기준: {base.year}년 총 {base.total_억원.toFixed(1)}억원 · {base.source}</p>
              </div>
              {hasAdjustment && (
                <button
                  onClick={() => setSliders({})}
                  style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
                >
                  초기화
                </button>
              )}
            </div>

            <div className="stack">
              {base.sectors.map(s => {
                const pct    = sliders[s.sector] ?? 0;
                const delta  = s.budget * (pct / 100);
                const newBudget = s.budget + delta;
                return (
                  <div key={s.sector} className="sim-slider-row">
                    <div className="sim-slider-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label className="sim-slider-label">{s.sector}</label>
                        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
                          {s.budget.toFixed(1)}억 →{" "}
                          <span style={{ color: pct !== 0 ? sliderColor(pct) : "var(--faint)", fontWeight: 600 }}>
                            {newBudget.toFixed(1)}억
                          </span>
                        </span>
                      </div>
                      <span
                        className="sim-slider-value"
                        style={{ color: sliderColor(pct) }}
                      >
                        {pctLabel(pct)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-50} max={50} step={5} value={pct}
                      onChange={e => setSlider(s.sector, Number(e.target.value))}
                      style={{ accentColor: sliderColor(pct) }}
                    />
                    {/* SDG 태그 */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {(SECTOR_SDG[s.sector] ?? []).map(g => (
                        <span key={g} style={{
                          fontSize: 11, padding: "1px 6px",
                          background: "var(--surface-2)",
                          borderRadius: 4,
                          color: "var(--muted)",
                        }}>{g}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 실시간 효과 패널 ── */}
        <div className="stack">
          {/* KPI 카드 3개 */}
          <div className="grid-3" style={{ gap: 10 }}>
            <div className="sim-result-card">
              <span className="sim-result-label">HDI 변화 추정</span>
              <span className="sim-result-value" style={{
                color: !calc || calc.deltaHdi === 0 ? "var(--faint)"
                     : calc.deltaHdi > 0 ? "var(--success)" : "#ef4444",
              }}>
                {calc ? `${calc.deltaHdi >= 0 ? "+" : ""}${calc.deltaHdi.toFixed(4)}` : "—"}
              </span>
              <span className="sim-result-sub">
                {base.hdi > 0 && calc && calc.deltaHdi !== 0
                  ? `${base.hdi.toFixed(3)} → ${(base.hdi + calc.deltaHdi).toFixed(3)}`
                  : "슬라이더를 조정하세요"}
              </span>
            </div>

            <div className="sim-result-card">
              <span className="sim-result-label">수혜 인구 변화</span>
              <span className="sim-result-value" style={{
                fontSize: 18,
                color: !calc || calc.deltaBeneficiaries === 0 ? "var(--faint)"
                     : calc.deltaBeneficiaries > 0 ? "var(--success)" : "#ef4444",
              }}>
                {calc && calc.deltaBeneficiaries !== 0
                  ? `${calc.deltaBeneficiaries > 0 ? "+" : ""}${calc.deltaBeneficiaries.toLocaleString()}`
                  : "—"}
              </span>
              <span className="sim-result-sub">명 추가 수혜 추정</span>
            </div>

            <div className="sim-result-card">
              <span className="sim-result-label">SDG 기여 변화</span>
              <span className="sim-result-value" style={{
                color: !calc || calc.deltaSdgScore === 0 ? "var(--faint)"
                     : calc.deltaSdgScore > 0 ? "var(--success)" : "#ef4444",
              }}>
                {calc && calc.deltaSdgScore !== 0
                  ? `${calc.deltaSdgScore > 0 ? "+" : ""}${calc.deltaSdgScore}`
                  : "—"}
              </span>
              <span className="sim-result-sub">
                {calc && calc.affectedSdg.length > 0
                  ? calc.affectedSdg.slice(0, 3).join(" · ") + (calc.affectedSdg.length > 3 ? "…" : "")
                  : "점수 변화"}
              </span>
            </div>
          </div>

          {/* 영향 SDG 목록 */}
          {calc && calc.affectedSdg.length > 0 && (
            <div className="card">
              <div className="card-body" style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>조정된 섹터의 SDG 연계</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 6px" }}>
                  {calc.affectedSdg.map(g => (
                    <span key={g} className="badge badge-blue" style={{ fontSize: 12 }}>{g}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI 분석 버튼 */}
          <button
            className="btn-accent"
            onClick={handleAiAnalyze}
            disabled={loadingAI || !hasAdjustment}
            style={{ width: "100%", opacity: hasAdjustment ? 1 : 0.45 }}
          >
            {loadingAI ? <><span className="spinner white" /> AI 분석 중…</> : "✦ AI 시나리오 분석"}
          </button>
          {!hasAdjustment && (
            <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--faint)", marginTop: -8 }}>
              슬라이더를 하나 이상 조정하면 활성화됩니다
            </p>
          )}
          {aiError && (
            <div className="error-banner"><span>⚠</span><span>{aiError}</span></div>
          )}
        </div>
      </div>

      {/* ── AI 시나리오 분석 결과 ── */}
      {aiResult && (
        <div className="card" style={{ borderColor: "rgba(29,78,216,.2)", background: "rgba(29,78,216,.02)" }}>
          <div className="card-body">
            <div className="card-head" style={{ marginBottom: 18 }}>
              <div>
                <p className="card-title">✦ AI 시나리오 분석 결과</p>
                <p className="card-meta">Claude AI 정책 효과성 분석 · claude-haiku-4-5</p>
              </div>
              <div style={{
                padding: "6px 14px",
                borderRadius: "var(--r-lg)",
                background: aiResult.overall_score >= 70 ? "rgba(16,185,129,.12)" : "rgba(245,158,11,.12)",
                border: `1px solid ${aiResult.overall_score >= 70 ? "rgba(16,185,129,.3)" : "rgba(245,158,11,.3)"}`,
              }}>
                <span style={{
                  fontSize: 20, fontWeight: 700,
                  color: aiResult.overall_score >= 70 ? "var(--success)" : "#d97706",
                }}>
                  {aiResult.overall_score}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 3 }}>/100</span>
              </div>
            </div>

            {/* 권고 배너 */}
            {aiResult.recommendation && (
              <div style={{
                padding: "10px 14px",
                background: "var(--accent-soft)",
                borderRadius: "var(--r-md)",
                fontSize: 13.5,
                color: "var(--accent-strong)",
                fontWeight: 500,
                marginBottom: 16,
                lineHeight: 1.5,
              }}>
                💡 {aiResult.recommendation}
              </div>
            )}

            <div className="grid-2" style={{ gap: 12 }}>
              {[
                { label: "전략적 근거",   key: "strategy",          icon: "◈" },
                { label: "기대 성과",     key: "expected_outcomes", icon: "◉" },
                { label: "리스크",        key: "risks",             icon: "⚠" },
                { label: "유사 성공 사례", key: "case_study",       icon: "✓" },
              ].map(({ label, key, icon }) => (
                <div key={key} style={{
                  padding: "14px 16px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg)",
                  background: "var(--surface)",
                }}>
                  <p style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
                    {icon} {label}
                  </p>
                  <p style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6 }}>
                    {aiResult[key as keyof AiAnalysis] as string}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 유사 성공사례 (KOICA 사업 기반) ── */}
      <div className="card">
        <div className="card-body">
          <div className="card-head" style={{ marginBottom: 14 }}>
            <div>
              <p className="card-title">유사 성공 사례</p>
              <p className="card-meta">KOICA 실제 사업 기록 기반</p>
            </div>
          </div>
          <div className="stack">
            {(base.success_cases || []).map((c, i) => (
              <div key={i} className="sim-case">
                <span className="sim-case-icon">✓</span>
                <div style={{ flex: 1 }}>
                  <p className="sim-case-name">{c.name}</p>
                  <p className="sim-case-detail">{c.detail}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <span className="badge badge-neutral" style={{ fontSize: 11.5 }}>{c.country}</span>
                    <span className="badge badge-blue"    style={{ fontSize: 11.5 }}>{c.sdg}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="sim-disclaimer" style={{ marginTop: 14 }}>
            ⓘ 본 시뮬레이션은 KOICA 협력국 통합 개발 지표(data.go.kr) 기반 추정치이며,
            실제 정책 효과를 보장하지 않습니다. AI 분석은 정책 참고용입니다.
          </p>
        </div>
      </div>

    </div>
  );
}

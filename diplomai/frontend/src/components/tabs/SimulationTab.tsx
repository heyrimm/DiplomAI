"use client";

import { useState } from "react";

interface ScenarioResult {
  youthEmployment:   string;
  womenEntrepreneurs: string;
  sdgCoverage:       string;
  successCases: { name: string; detail: string; similarity: number }[];
}

function runScenario(ict: number, gender: number, years: number): ScenarioResult {
  const youthDelta = (ict * 0.14).toFixed(1);
  const women      = Math.round(gender * 60);
  const sdg        = Math.min(17, 11 + Math.floor((ict + gender) / 25));

  return {
    youthEmployment:    `+${youthDelta}%p`,
    womenEntrepreneurs: `+${women.toLocaleString()}명`,
    sdgCoverage:        `${sdg}/17`,
    successCases: [
      {
        name: "베트남 ICT 직업교육 사업 (2019–2023)",
        detail: `ICT 예산 25% 증가 → 청년 취업률 3.8%p 개선. 여성 수강생 비율 44%.`,
        similarity: 82,
      },
      {
        name: "필리핀 여성 디지털 창업 지원 (2020–2024)",
        detail: `젠더 예산 30% 확대 → 여성 창업자 2,100명 배출. SDG 5·8 동시 달성.`,
        similarity: 67,
      },
    ],
  };
}

export default function SimulationTab() {
  const [ict,    setIct]    = useState(30);
  const [gender, setGender] = useState(20);
  const [years,  setYears]  = useState(5);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => { setResult(runScenario(ict, gender, years)); setLoading(false); }, 800);
  };

  return (
    <div className="stack">
      {/* Config card */}
      <div className="card">
        <div className="card-body">
          <div className="card-head">
            <div>
              <p className="card-title">시뮬레이션 조건 설정</p>
              <p className="card-meta">과거 데이터 기반 시나리오 생성 · 예측 아님</p>
            </div>
            <span className="badge badge-amber">베타</span>
          </div>

          <div className="stack">
            <SliderField
              label="ICT 분야 예산 증감 (%)"
              value={ict} onChange={setIct} min={-50} max={100}
              display={`${ict > 0 ? "+" : ""}${ict}%`}
            />
            <SliderField
              label="젠더·여성 분야 예산 증감 (%)"
              value={gender} onChange={setGender} min={-50} max={100}
              display={`${gender > 0 ? "+" : ""}${gender}%`}
            />
            <SliderField
              label="사업 기간 (년)"
              value={years} onChange={setYears} min={1} max={10}
              display={`${years}년`}
            />
          </div>

          <button
            className="btn-accent"
            onClick={handleGenerate}
            disabled={loading}
            style={{ marginTop: 20, width: "100%" }}
          >
            {loading ? <span className="spinner white" /> : "✦"}
            AI 시나리오 생성 ↗
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* Results */}
          <div className="card">
            <div className="card-body">
              <p className="card-title" style={{ marginBottom: 14 }}>
                ✦ 시나리오 예측 결과 (ICT {ict > 0 ? "+" : ""}{ict}% · 젠더 {gender > 0 ? "+" : ""}{gender}% · {years}년)
              </p>
              <div className="grid-3">
                <div className="sim-result-card">
                  <span className="sim-result-label">청년 취업 기여</span>
                  <span className="sim-result-value">{result.youthEmployment}</span>
                  <span className="sim-result-sub">유사 사례 베트남 2019 기준</span>
                </div>
                <div className="sim-result-card">
                  <span className="sim-result-label">여성 ICT 창업자</span>
                  <span className="sim-result-value">{result.womenEntrepreneurs}</span>
                  <span className="sim-result-sub">{years}년 누적 추정</span>
                </div>
                <div className="sim-result-card">
                  <span className="sim-result-label">SDG 커버리지</span>
                  <span className="sim-result-value">{result.sdgCoverage}</span>
                  <span className="sim-result-sub">현재 11개 → +{parseInt(result.sdgCoverage) - 11}개</span>
                </div>
              </div>
            </div>
          </div>

          {/* Success cases */}
          <div className="card">
            <div className="card-body">
              <p className="card-title" style={{ marginBottom: 14 }}>유사 성공 시나리오</p>
              <div className="stack">
                {result.successCases.map((c) => (
                  <div key={c.name} className="sim-case">
                    <span className="sim-case-icon">✓</span>
                    <div>
                      <p className="sim-case-name">{c.name}</p>
                      <p className="sim-case-detail">{c.detail}</p>
                    </div>
                    <span className="sim-similarity">유사도 {c.similarity}%</span>
                  </div>
                ))}
              </div>
              <p className="sim-disclaimer">
                ⓘ 본 시뮬레이션은 과거 KOICA 데이터와 유사 사례 기반 시나리오이며, 실제 정책 효과를 보장하지 않습니다.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SliderField({
  label, value, onChange, min, max, display,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; display: string;
}) {
  return (
    <div className="sim-slider-row">
      <div className="sim-slider-header">
        <label className="sim-slider-label">{label}</label>
        <span className="sim-slider-value">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

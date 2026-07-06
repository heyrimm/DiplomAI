"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import CitedText from "@/components/CitedText";
import type { Country, EvaluateResult } from "@/types";

/** File → base64 (data URL 접두어 제거) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

interface Props {
  country: Country;
}

const GRADE_CLASS: Record<string, string> = {
  유망:   "grade-good",
  조건부: "grade-mid",
  재검토: "grade-low",
};

const EXAMPLES = [
  "농촌 지역 태양광 정수 시스템 보급",
  "직업훈련원 기반 청년 IT 인력 양성",
  "모자보건 디지털 진료 네트워크 구축",
];

export default function BusinessEvaluator({ country }: Props) {
  const [item, setItem] = useState("");
  const [pdf, setPdf] = useState<{ name: string; base64: string } | null>(null);
  const [result, setResult] = useState<EvaluateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canRun = (item.trim().length > 0 || pdf !== null) && !loading;

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 허용
    if (!file) return;
    if (file.type !== "application/pdf") { setError("PDF 파일만 첨부할 수 있습니다."); return; }
    if (file.size > 32 * 1024 * 1024) { setError("PDF는 32MB 이하만 가능합니다."); return; }
    setError(null);
    const base64 = await fileToBase64(file);
    setPdf({ name: file.name, base64 });
  };

  const run = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.evaluateItem(country.id, {
        item: item.trim() || undefined,
        pdfBase64: pdf?.base64,
        pdfName: pdf?.name,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "진단 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack">
      {/* 입력 */}
      <div className="card">
        <div className="card-body">
          <div className="card-head" style={{ marginBottom: 12 }}>
            <div>
              <p className="card-title">사업 아이템 타당성 진단</p>
              <p className="card-meta">
                {country.name} 공공데이터(KOICA ODA·분야 비중·세종학당·KF·SDG)에 근거해 가능성을 평가합니다
              </p>
            </div>
          </div>

          <textarea
            className="eval-input"
            rows={3}
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder={`${country.name}에서 추진하려는 사업 아이템을 입력하거나, 아래에서 사업계획서 PDF를 첨부하세요\n예) ${EXAMPLES[0]}`}
          />

          <div className="eval-examples">
            <span className="eval-examples-label">예시</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} className="eval-example-chip" onClick={() => setItem(ex)}>
                {ex}
              </button>
            ))}
          </div>

          {/* PDF 사업계획서 첨부 (선택) */}
          <div className="eval-pdf-row">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={onPickFile}
              style={{ display: "none" }}
            />
            {pdf ? (
              <div className="eval-pdf-chip">
                <span className="eval-pdf-name">📄 {pdf.name}</span>
                <button className="eval-pdf-remove" onClick={() => setPdf(null)} aria-label="첨부 취소">✕</button>
              </div>
            ) : (
              <button className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                📄 PDF 사업계획서 첨부
              </button>
            )}
            <span className="eval-pdf-hint">텍스트·PDF 중 하나만 넣어도 되고, 함께 넣으면 둘 다 반영됩니다 (PDF ≤ 32MB)</span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button className="btn-accent" onClick={run} disabled={!canRun}>
              {loading ? <><span className="spinner white" /> 진단 중…</> : "가능성 진단하기"}
            </button>
          </div>

          {error && (
            <div className="error-banner" style={{ marginTop: 12 }}>
              <span>⚠</span><span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* 결과 */}
      {result && (
        <>
          {/* 점수 요약 */}
          <div className="card">
            <div className="card-body">
              <div className="eval-score-row">
                <div className={`eval-score-badge ${GRADE_CLASS[result.grade] ?? "grade-mid"}`}>
                  <span className="eval-score-num">{result.score}</span>
                  <span className="eval-score-unit">/100</span>
                </div>
                <div className="eval-score-meta">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className={`badge ${
                      result.grade === "유망" ? "badge-green"
                      : result.grade === "재검토" ? "badge-red" : "badge-amber"}`}>
                      {result.grade}
                    </span>
                    <span className="eval-sector-tag">분야: {result.sector}</span>
                  </div>
                  <span className="eval-target">{result.item}</span>
                  <p className="eval-summary"><CitedText text={result.summary} /></p>
                </div>
              </div>

              {/* 항목별 점수 바 */}
              <div className="eval-components">
                {result.components.map((c) => {
                  const pct = Math.round((c.score / c.max) * 100);
                  const tone = pct >= 70 ? "success" : pct >= 40 ? "warning" : "danger";
                  return (
                    <div key={c.label} className="eval-comp">
                      <div className="eval-comp-head">
                        <span className="eval-comp-label">{c.label}</span>
                        <span className="eval-comp-score">{c.score}<span className="eval-comp-max">/{c.max}</span></span>
                      </div>
                      <div className="bar-track">
                        <div className={`bar-fill ${tone}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="eval-comp-note"><CitedText text={c.note} /></p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 강점 / 리스크 */}
          <div className="grid-2">
            <div className="card">
              <div className="card-body">
                <p className="card-title" style={{ marginBottom: 12 }}>✅ 강점</p>
                <ul className="eval-list">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="eval-list-item pos"><CitedText text={s} /></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <p className="card-title" style={{ marginBottom: 12 }}>⚠ 리스크</p>
                <ul className="eval-list">
                  {result.risks.map((s, i) => (
                    <li key={i} className="eval-list-item neg"><CitedText text={s} /></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 종합 근거 */}
          <div className="ai-insight">
            <div>
              <p className="ai-insight-label">종합 판단 근거</p>
              <p className="ai-insight-text"><CitedText text={result.reasoning} /></p>
            </div>
          </div>

          {/* 개선 제안 */}
          {result.adjustments.length > 0 && (
            <div className="card">
              <div className="card-body">
                <p className="card-title" style={{ marginBottom: 12 }}>성공 확률을 높이는 조정안</p>
                <ol className="eval-adjust">
                  {result.adjustments.map((a, i) => (
                    <li key={i} className="eval-adjust-item"><CitedText text={a} /></li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* 유사 선례 */}
          {result.similar_precedents.length > 0 && (
            <div className="card">
              <div className="card-body">
                <p className="card-title" style={{ marginBottom: 12 }}>유사 선례</p>
                <ul className="eval-list">
                  {result.similar_precedents.map((p, i) => (
                    <li key={i} className="eval-list-item"><CitedText text={p} /></li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <p className="eval-disclaimer">
            ※ 점수는 KOICA·세종학당·KF 등 공공데이터 신호를 규칙 기반으로 합산한 의사결정 참고치이며, 실제 사업 승인·성과를 보장하지 않습니다.
          </p>
        </>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { flagSrc } from "@/lib/flags";
import { Upload, Grid, XIcon } from "@/components/icons";
import type { CountryRecommendResult } from "@/types";

interface Props {
  onSelect: (countryId: string) => void;
  onBrowse: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const EXAMPLES = [
  "저소득 국가 농촌 태양광 정수 + 위생교육 패키지",
  "직업훈련원 기반 청년 IT 인력 양성 플랫폼",
  "프리미엄 원두 카페 프랜차이즈",
];

const ACCEPT = ".pdf,.hwp,application/pdf";

export default function CountryRecommender({ onSelect, onBrowse }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [item, setItem] = useState("");
  const [file, setFile] = useState<{ name: string; base64: string } | null>(null);
  const [result, setResult] = useState<CountryRecommendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canRun = (item.trim().length > 0 || file !== null) && !loading;

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const ok = f.type === "application/pdf" || /\.(pdf|hwp)$/i.test(f.name);
    if (!ok) { setError("PDF 또는 HWP 파일만 첨부할 수 있습니다."); return; }
    if (f.size > 32 * 1024 * 1024) { setError("파일은 32MB 이하만 가능합니다."); return; }
    setError(null);
    setFile({ name: f.name, base64: await fileToBase64(f) });
  };

  const run = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.recommendCountries({
        item: item.trim() || undefined,
        fileBase64: file?.base64,
        fileName: file?.name,
      });
      setResult(res);
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "추천 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rec-wrap">
      <div className="rec-head">
        <h1 className="rec-title">어떻게 시작할까요?</h1>
        <p className="rec-desc">
          내 사업을 등록해 <strong>적합한 진출 국가</strong>를 추천받거나,
          국가별 <strong>추천 사업</strong>을 바로 살펴보세요.
        </p>
      </div>

      {/* 큰 선택 버튼 2개 */}
      <div className="rec-choices">
        <button className="rec-choice primary" onClick={() => { setError(null); setModalOpen(true); }}>
          <span className="rec-choice-ic"><Upload size={26} /></span>
          <span className="rec-choice-t">사업 아이템 등록하기</span>
          <span className="rec-choice-d">아이템 설명·자료(PDF·HWP)를 넣으면 최적 진출 국가를 추천</span>
        </button>
        <button className="rec-choice" onClick={onBrowse}>
          <span className="rec-choice-ic"><Grid size={26} /></span>
          <span className="rec-choice-t">국가별 추천 사업 확인하기</span>
          <span className="rec-choice-d">국가를 골라 ODA·공공외교 기반 추천 사업을 확인</span>
        </button>
      </div>

      {/* 추천 결과 */}
      {result && (
        <div className="rec-results">
          <div className="trend-header">
            <span className="trend-title">추천 진출 국가</span>
            <span className="trend-sub">「{result.item}」 · 적합도 순 · 클릭하면 해당 국가 분석으로 이동</span>
          </div>
          {result.recommendations.length === 0 ? (
            <div className="empty-state">적합한 후보를 찾지 못했습니다. 사업 설명을 조금 더 구체적으로 입력해 보세요.</div>
          ) : (
            <div className="rec-country-grid">
              {result.recommendations.map((r, i) => (
                <button key={r.country_id} className="rec-country-card" onClick={() => onSelect(r.country_id)}>
                  <span className="rcc-rank">{i + 1}</span>
                  <span className="rcc-flag">
                    {flagSrc(r.country_id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={flagSrc(r.country_id)!} alt={`${r.country_name} 국기`} />
                    ) : "🏳️"}
                  </span>
                  <div className="rcc-body">
                    <div className="rcc-head">
                      <span className="rcc-name">{r.country_name}</span>
                      <span className="rcc-fit">적합도 {r.fit_score}</span>
                    </div>
                    <span className="rcc-meta">{r.region}{r.income_level ? ` · ${r.income_level}` : ""}</span>
                    <p className="rcc-reason">{r.reason}</p>
                    {r.angle && <p className="rcc-angle">💡 {r.angle}</p>}
                    <span className="rcc-cta">이 국가로 분석 시작 →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 사업 아이템 등록 모달 */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => !loading && setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <p className="modal-title">사업 아이템 등록</p>
              <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="닫기"><XIcon size={16} /></button>
            </div>

            <textarea
              className="eval-input"
              rows={4}
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder={`추진하려는 사업 아이템을 설명하세요\n예) ${EXAMPLES[0]}`}
              autoFocus
            />
            <div className="eval-examples">
              <span className="eval-examples-label">예시</span>
              {EXAMPLES.map((ex) => (
                <button key={ex} className="eval-example-chip" onClick={() => setItem(ex)}>{ex}</button>
              ))}
            </div>

            <div className="eval-pdf-row">
              <input ref={fileRef} type="file" accept={ACCEPT} onChange={onPickFile} style={{ display: "none" }} />
              {file ? (
                <div className="eval-pdf-chip">
                  <span className="eval-pdf-name">📄 {file.name}</span>
                  <button className="eval-pdf-remove" onClick={() => setFile(null)} aria-label="첨부 취소">✕</button>
                </div>
              ) : (
                <button className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>📄 자료 첨부 (PDF·HWP)</button>
              )}
              <span className="eval-pdf-hint">텍스트·파일 중 하나만 넣어도 되고, 함께 넣으면 둘 다 반영됩니다 (≤ 32MB)</span>
            </div>

            {error && <div className="error-banner" style={{ marginTop: 12 }}><span>⚠</span><span>{error}</span></div>}

            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setModalOpen(false)}>취소</button>
              <button className="btn-accent" onClick={run} disabled={!canRun}>
                {loading ? <><span className="spinner white" /> 분석 중…</> : "국가 추천 받기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

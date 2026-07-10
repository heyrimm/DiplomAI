"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Country, EntryGuideResult } from "@/types";

export interface EntryGuideSeed {
  item: string;
  sector?: string;
}

interface Props {
  country: Country;
  seed?: EntryGuideSeed;
}

export default function EntryGuidePanel({ country, seed }: Props) {
  const [item, setItem] = useState(seed?.item ?? "");
  const [sector, setSector] = useState(seed?.sector ?? "");
  const [guide, setGuide] = useState<EntryGuideResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const requestId = useRef(0);

  const generate = useCallback(async (guideItem: string, guideSector?: string) => {
    const normalized = guideItem.trim();
    if (!normalized) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    setGuide(null);
    try {
      const result = await api.getEntryGuide(country.id, normalized, guideSector || undefined);
      if (requestId.current === currentRequest) {
        setGuide(result);
        setShowEvidence(false);
      }
    } catch (e) {
      if (requestId.current === currentRequest) {
        setError(e instanceof Error ? e.message : "가이드 생성 실패");
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [country.id]);

  useEffect(() => {
    // 국가 또는 진입 시드가 바뀌면 이전 국가의 결과와 진행 중 응답을 폐기한다.
    requestId.current += 1;
    setGuide(null);
    setError(null);
    setShowEvidence(false);
    setLoading(false);
    setItem(seed?.item ?? "");
    setSector(seed?.sector ?? "");

    if (seed?.item.trim()) void generate(seed.item, seed.sector);
  }, [country.id, generate, seed?.item, seed?.sector]);

  return (
    <div className="stack">
      <div className="card">
        <div className="card-body">
          <div className="card-head" style={{ marginBottom: 12 }}>
            <div>
              <p className="card-title">현지 실행 준비 가이드</p>
              <p className="card-meta">
                {country.name}에서 추진할 사업의 등록·인허가·통관·협업 관례를 KOTRA 공공데이터 근거로 정리합니다
              </p>
            </div>
          </div>
          <textarea
            className="eval-input"
            rows={3}
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder={`${country.name}에서 실행할 사업명을 입력하세요\n예) 농촌 지역 태양광 정수 시스템 보급`}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <input
              className="eval-input"
              style={{ minHeight: 38, flex: "1 1 220px" }}
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="사업 분야 (선택)"
            />
            <button
              className="btn-accent"
              onClick={() => void generate(item, sector)}
              disabled={!item.trim() || loading}
            >
              {loading ? <><span className="spinner white" /> 생성 중…</> : guide ? "↻ 다시 생성" : "실행 가이드 생성 →"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner"><span>⚠</span><span>{error}</span></div>
      )}

      {loading && !guide && (
        <div className="card">
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 13 }}>
            <span className="spinner" /> {country.name} 현지 실행 준비 가이드를 생성 중… (최대 1분 소요)
          </div>
        </div>
      )}

      {guide && (
        <div className="card">
          <div className="card-body">
            <div className="stack">
              <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px", background: "var(--surface-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <span className="badge badge-blue">AI 요약</span>
                  {guide.difficulty?.level && (
                    <span className={`badge ${guide.difficulty.level.includes("낮") ? "badge-green" : guide.difficulty.level.includes("높") ? "badge-red" : "badge-amber"}`}>
                      실행 난이도 {guide.difficulty.level}
                    </span>
                  )}
                  {guide.total_duration && <span className="badge badge-neutral">⏱ 예상 {guide.total_duration}</span>}
                </div>
                {guide.overview && <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.65, marginBottom: 4 }}>{guide.overview}</p>}
                {guide.difficulty?.reason && <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>{guide.difficulty.reason}</p>}
                <div style={{ display: "grid", gap: 14, marginTop: 6, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
                  {(guide.key_risks ?? []).length > 0 && (
                    <div>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--danger)", marginBottom: 6 }}>⚠ 핵심 리스크</p>
                      <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                        {guide.key_risks!.map((risk, i) => <li key={i} style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>{risk}</li>)}
                      </ol>
                    </div>
                  )}
                  {(guide.first_actions ?? []).length > 0 && (
                    <div>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--success)", marginBottom: 6 }}>✅ 지금 할 첫 액션</p>
                      <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
                        {guide.first_actions!.map((action, i) => <li key={i} style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>{action}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
                {(guide.must_check ?? []).length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>반드시 확인:</span>
                    {guide.must_check!.map((agency, i) => <span key={i} className="badge badge-blue">{agency}</span>)}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>실행 준비 단계</p>
                <span className="badge badge-blue">AI 요약</span>
              </div>
              <div className="stack" style={{ gap: 0 }}>
                {guide.steps.map((step, i) => (
                  <div key={step.order ?? i} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent)", color: "#fff", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{step.order ?? i + 1}</span>
                      {i < guide.steps.length - 1 && <span style={{ width: 2, flex: 1, background: "var(--line)", margin: "4px 0" }} />}
                    </div>
                    <div style={{ paddingBottom: i < guide.steps.length - 1 ? 18 : 0, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{step.title}</span>
                        {step.duration && <span className="badge badge-neutral">{step.duration}</span>}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.6 }}>{step.description}</p>
                      {step.agency && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>담당·접촉: {step.agency}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {([ ["📦 통관·수입 규제", guide.customs], ["⚖️ 핵심 법률·규제", guide.legal], ["🤝 현지 비즈니스 관례", guide.practices] ] as [string, string[]][])
                .filter(([, list]) => list.length > 0)
                .map(([title, list]) => (
                  <div key={title} style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{title}</p>
                      <span className="badge badge-blue">AI 요약</span>
                    </div>
                    <ul className="eval-list">{list.map((text, i) => <li key={i} className="eval-list-item">{text}</li>)}</ul>
                  </div>
                ))}

              {guide.nation && Object.keys(guide.nation.sections ?? {}).length > 0 && (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>근거 자료</p>
                    <span className="badge badge-neutral">KOTRA 원문</span>
                    <span style={{ fontSize: 11.5, color: "var(--muted)" }}>위 AI 요약의 근거가 된 KOTRA 국가정보 원문</span>
                    <button className="btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setShowEvidence((visible) => !visible)}>
                      {showEvidence ? "근거 접기 ▲" : "근거 보기 ▼"}
                    </button>
                  </div>
                  {showEvidence && (
                    <div className="stack" style={{ gap: 10, marginTop: 12 }}>
                      {Object.entries(guide.nation.sections).map(([title, text]) => (
                        <div key={title} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{title}</p>
                            <span className="badge badge-neutral">KOTRA 원문</span>
                          </div>
                          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.65, whiteSpace: "pre-line", maxHeight: 220, overflowY: "auto" }}>{text}</p>
                        </div>
                      ))}
                      {(guide.nation.offices ?? []).length > 0 && (
                        <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
                          <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>KOTRA 무역관</p>
                          <ul className="eval-list">
                            {guide.nation.offices!.map((office, i) => <li key={`${office.name}-${i}`} className="eval-list-item">{office.name}{office.contact ? ` · ${office.contact}` : ""}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(guide.news ?? []).length > 0 && (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>📰 최신 통상·규제 동향</p>
                    <span className="badge badge-green">KOTRA 뉴스</span>
                  </div>
                  <ul className="eval-list">
                    {guide.news!.map((news, i) => (
                      <li key={i} className="eval-list-item">
                        <a href={news.url || undefined} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: news.url ? "underline" : "none" }}>{news.title}</a>
                        <span style={{ fontSize: 11.5, color: "var(--muted)", marginLeft: 6 }}>{news.date}{news.category ? ` · ${news.category}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {guide.resources.length > 0 && (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>확인 채널</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{guide.resources.map((resource, i) => <span key={i} className="badge badge-blue">{resource}</span>)}</div>
                </div>
              )}
              {(guide.data_sources ?? []).length > 0 && <p style={{ fontSize: 11.5, color: "var(--muted)" }}>데이터 출처: {guide.data_sources!.join(" · ")}</p>}
              <p className="eval-disclaimer">
                ※ 본 가이드는 공공데이터와 AI를 기반으로 한 사전 검토 자료이며, 실제 법인 설립·인허가·통관·세무·노무 사항은 KOTRA 무역관, 현지 대사관, 법률·회계 전문가를 통해 최종 확인해야 합니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

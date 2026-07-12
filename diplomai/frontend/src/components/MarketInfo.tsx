"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Country, MarketInfoResult, MarketTrendPoint, MarketBriefResult } from "@/types";

interface Props {
  country: Country;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** 문자열 지표값 → 숫자 (콤마·단위 제거) */
function num(s: string): number | null {
  const v = parseFloat((s ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(v) ? v : null;
}

function fmtIndicator(value: number, unit: string): string {
  if (unit === "USD") return `$${Math.round(value).toLocaleString()}`;
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "명") {
    if (value >= 1e8) return `${(value / 1e8).toFixed(2)}억`;
    if (value >= 1e4) return `${(value / 1e4).toFixed(0)}만`;
    return value.toLocaleString();
  }
  return `${value}${unit === "/5" ? " /5" : ""}`;
}

/** 얇은 단색 스파크라인 (단일 시리즈 → 범례 불필요) */
function Sparkline({ points }: { points: MarketTrendPoint[] }) {
  const vals = points.map((p) => num(p.value)).filter((v): v is number => v !== null);
  if (vals.length < 2) return null;
  const W = 160, H = 44, pad = 4;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const step = (W - pad * 2) / (vals.length - 1);
  const xy = vals.map((v, i) => [
    pad + i * step,
    pad + (H - pad * 2) * (1 - (v - min) / span),
  ]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${H - pad} L${xy[0][0].toFixed(1)},${H - pad} Z`;
  const first = vals[0], last = vals[vals.length - 1];
  const delta = last - first;
  const pct = first ? (delta / Math.abs(first)) * 100 : 0;
  return (
    <div className="mkt-spark">
      <svg viewBox={`0 0 ${W} ${H}`} className="mkt-spark-svg" preserveAspectRatio="none">
        <path d={area} className="mkt-spark-area" />
        <path d={line} className="mkt-spark-line" />
        <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="2.5" className="mkt-spark-dot" />
      </svg>
      <span className={`mkt-spark-delta ${delta >= 0 ? "up" : "down"}`}>
        {delta >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
      </span>
    </div>
  );
}

const TREND_META: { key: "gdp" | "fx" | "inflation"; label: string }[] = [
  { key: "gdp", label: "명목 GDP" },
  { key: "fx", label: "환율" },
  { key: "inflation", label: "물가상승률" },
];

export default function MarketInfo({ country }: Props) {
  const [data, setData] = useState<MarketInfoResult | null>(null);
  const [loading, setLoading] = useState(true);

  // 사업 맞춤 브리핑
  const [item, setItem] = useState("");
  const [pdf, setPdf] = useState<{ name: string; base64: string } | null>(null);
  const [brief, setBrief] = useState<MarketBriefResult | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setBrief(null); setItem(""); setPdf(null); setBriefError(null);
    api.getMarketInfo(country.id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [country.id]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") { setBriefError("PDF 파일만 첨부할 수 있습니다."); return; }
    if (file.size > 32 * 1024 * 1024) { setBriefError("PDF는 32MB 이하만 가능합니다."); return; }
    setBriefError(null);
    setPdf({ name: file.name, base64: await fileToBase64(file) });
  };

  const runBrief = async () => {
    if ((!item.trim() && !pdf) || briefLoading) return;
    setBriefLoading(true);
    setBriefError(null);
    try {
      const res = await api.getMarketBrief(country.id, {
        item: item.trim() || undefined,
        pdfBase64: pdf?.base64,
        pdfName: pdf?.name,
      });
      setBrief(res);
    } catch (e) {
      setBriefError(e instanceof Error ? e.message : "브리핑 생성 실패");
    } finally {
      setBriefLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-state"><span className="spinner" /><span>시장정보 불러오는 중…</span></div>;
  }
  if (!data) return <div className="empty-state">시장정보를 불러오지 못했습니다.</div>;

  const trends = TREND_META
    .map((t) => ({ ...t, points: data.trends[t.key] }))
    .filter((t) => t.points && t.points.length >= 2);

  const canBrief = (item.trim().length > 0 || pdf !== null) && !briefLoading;

  return (
    <div className="stack">
      {/* 사업 맞춤 브리핑 입력 */}
      <div className="card mkt-brief-card">
        <div className="card-body">
          <p className="mkt-brief-title">🎯 사업 아이템을 등록하면 더 정확해집니다</p>
          <p className="card-meta" style={{ margin: "4px 0 12px" }}>
            사업 아이템·자료(PDF)를 넣으면, 아래 시장데이터를 <strong>내 사업 관점</strong>으로 분석해 맞춤 브리핑을 드립니다.
          </p>
          <textarea
            className="eval-input"
            rows={2}
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder={`${country.name}에서 하려는 사업을 설명하세요 (예: 프리미엄 원두 카페 프랜차이즈)`}
          />
          <div className="eval-pdf-row">
            <input ref={fileRef} type="file" accept="application/pdf" onChange={onPickFile} style={{ display: "none" }} />
            {pdf ? (
              <div className="eval-pdf-chip">
                <span className="eval-pdf-name">📄 {pdf.name}</span>
                <button className="eval-pdf-remove" onClick={() => setPdf(null)} aria-label="첨부 취소">✕</button>
              </div>
            ) : (
              <button className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>📄 사업 자료 PDF 첨부</button>
            )}
            <button className="btn-accent" style={{ marginLeft: "auto" }} onClick={runBrief} disabled={!canBrief}>
              {briefLoading ? <><span className="spinner white" /> 분석 중…</> : "맞춤 브리핑 받기"}
            </button>
          </div>
          {briefError && <div className="error-banner" style={{ marginTop: 10 }}><span>⚠</span><span>{briefError}</span></div>}
        </div>
      </div>

      {/* 맞춤 브리핑 결과 */}
      {brief && (
        <div className="card">
          <div className="card-body">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <p className="card-title">「{brief.item}」 맞춤 시장 브리핑</p>
              <span className="mkt-fit">시장 적합도 {brief.fit_score}<span style={{ fontSize: 10, fontWeight: 500 }}>/100</span></span>
            </div>
            {brief.summary && <p className="mkt-brief-text" style={{ marginBottom: 12 }}>{brief.summary}</p>}
            <div className="grid-3">
              {[
                { label: "유리한 요인", items: brief.favorable, cls: "" },
                { label: "리스크·규제", items: brief.risks, cls: "" },
                { label: "진입 팁", items: brief.entry_tips, cls: "" },
              ].map((b) => b.items.length > 0 && (
                <div key={b.label} className="mkt-brief-block">
                  <p className="mkt-brief-label">{b.label}</p>
                  <div className="mkt-brief-list">
                    {b.items.map((t, i) => <span key={i} className="mkt-brief-li">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 핵심 지표 타일 (World Bank) */}
      {data.indicators.length > 0 && (
        <div className="mkt-tiles">
          {data.indicators.map((i) => (
            <div key={i.label} className="mkt-tile">
              <span className="mkt-tile-label">{i.label}</span>
              <span className="mkt-tile-value">{fmtIndicator(i.value, i.unit)}</span>
              <span className="mkt-tile-meta">{i.source} · {i.year}</span>
            </div>
          ))}
        </div>
      )}

      {/* 추이 스파크라인 (KOTRA 국가정보) */}
      {trends.length > 0 && (
        <div className="grid-3">
          {trends.map((t) => {
            const last = t.points[t.points.length - 1];
            return (
              <div key={t.key} className="card">
                <div className="card-body" style={{ padding: 16 }}>
                  <div className="mkt-spark-head">
                    <span className="mkt-tile-label">{t.label}</span>
                    <span className="mkt-spark-latest">{last.value}<span className="mkt-spark-year"> ({last.year})</span></span>
                  </div>
                  <Sparkline points={t.points} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KOTRA 상세 (진출기업·규제·산업단지·생활) */}
      {data.kotra_available ? (
        <>
          <div className="grid-2">
            {/* 진출 한국기업 */}
            {data.korean_companies.length > 0 && (
              <div className="card"><div className="card-body">
                <p className="card-title" style={{ marginBottom: 12 }}>현지 진출 한국기업</p>
                <div className="mkt-list">
                  {data.korean_companies.map((c, i) => (
                    <div key={i} className="mkt-row">
                      <span className="mkt-row-main">{c.name}</span>
                      <span className="mkt-row-sub">{[c.industry, c.form, c.year && `${c.year}~`].filter(Boolean).join(" · ")}</span>
                    </div>
                  ))}
                </div>
              </div></div>
            )}

            {/* 대한국 수입규제 */}
            {data.import_regulations.length > 0 && (
              <div className="card"><div className="card-body">
                <p className="card-title" style={{ marginBottom: 12 }}>대한국 수입규제</p>
                <div className="mkt-list">
                  {data.import_regulations.map((r, i) => (
                    <div key={i} className="mkt-row">
                      <span className="mkt-row-main">{r.item} {r.hscode && <span className="mkt-tag">HS {r.hscode}</span>}</span>
                      <span className="mkt-row-sub">{r.content}</span>
                    </div>
                  ))}
                </div>
              </div></div>
            )}
          </div>

          {/* 산업단지 */}
          {data.industrial_complexes.length > 0 && (
            <div className="card"><div className="card-body">
              <p className="card-title" style={{ marginBottom: 12 }}>산업단지 (임차·입지)</p>
              <div className="grid-2">
                {data.industrial_complexes.map((c, i) => (
                  <div key={i} className="mkt-complex">
                    <span className="mkt-row-main">{c.name}</span>
                    {c.area && <span className="mkt-row-sub">면적 {c.area}</span>}
                    {c.rent && <span className="mkt-row-sub">임차료 {c.rent}</span>}
                    {c.addr && <span className="mkt-row-sub" style={{ color: "var(--faint)" }}>{c.addr}</span>}
                  </div>
                ))}
              </div>
            </div></div>
          )}

          {/* 생활정보 */}
          {data.living && (
            <div className="card"><div className="card-body">
              <p className="card-title" style={{ marginBottom: 12 }}>현지 생활정보</p>
              <div className="mkt-living">
                {data.living.religion && <div><span className="mkt-living-k">종교</span> {data.living.religion}</div>}
                {data.living.card && <div><span className="mkt-living-k">신용카드</span> {data.living.card}</div>}
                {data.living.taxi && <div><span className="mkt-living-k">택시</span> {data.living.taxi}</div>}
                {data.living.water && <div><span className="mkt-living-k">식수</span> {data.living.water}</div>}
                {data.living.culture && <div><span className="mkt-living-k">문화</span> {data.living.culture}</div>}
              </div>
            </div></div>
          )}

          {/* 대사관·한국기관 */}
          {data.offices.length > 0 && (
            <div className="card"><div className="card-body">
              <p className="card-title" style={{ marginBottom: 12 }}>대사관·한국기관</p>
              <div className="mkt-list">
                {data.offices.map((o, i) => (
                  <div key={i} className="mkt-row">
                    <span className="mkt-row-main">{o.name}</span>
                    <span className="mkt-row-sub">{o.contact}</span>
                  </div>
                ))}
              </div>
            </div></div>
          )}
        </>
      ) : (
        <div className="gap-banner info">
          <span className="gap-banner-icon">🛈</span>
          <div>
            <p className="gap-banner-title" style={{ color: "var(--accent)" }}>KOTRA 국가정보 연동 준비 중</p>
            <p className="gap-banner-desc">
              진출 한국기업·수입규제·산업단지·생활정보는 KOTRA 국가정보 API 키가 반영되면 자동으로 채워집니다.
              (현재 위 World Bank 거시지표는 정상 제공)
            </p>
          </div>
        </div>
      )}

      {data.sources.length > 0 && (
        <p className="eval-disclaimer">출처: {data.sources.join(" · ")}</p>
      )}
    </div>
  );
}

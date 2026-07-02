"use client";

import { useEffect, useState } from "react";
import type { OdaBudgetResponse, OdaGapsResponse, PeerComparisonResponse } from "@/types";
import OdaGapBanner from "@/components/OdaGapBanner";
import HorizontalBarChart from "@/components/HorizontalBarChart";

interface HistoryPoint { year: number; budget_억원: number; }

function OdaHistoryChart({ history }: { history: HistoryPoint[] }) {
  if (!history.length) return null;

  const W = 640, H = 170;
  const PAD = { top: 12, right: 16, bottom: 28, left: 48 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...history.map((d) => d.budget_억원), 1);
  const barW = plotW / history.length;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Grid lines + Y labels */}
      {yTicks.map((t) => {
        const y = PAD.top + plotH * (1 - t);
        const val = Math.round(maxVal * t);
        return (
          <g key={t}>
            <line x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y}
              stroke="var(--line)" strokeWidth={1} strokeDasharray={t === 0 ? "0" : "4 3"} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="var(--faint)">
              {val}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {history.map((d, i) => {
        const bH = Math.max((d.budget_억원 / maxVal) * plotH, 1);
        const x = PAD.left + i * barW;
        const y = PAD.top + plotH - bH;
        const showYear = d.year % 5 === 0 || d.year === history[history.length - 1].year;
        return (
          <g key={d.year}>
            <rect
              x={x + 1} y={y} width={Math.max(barW - 2, 1)} height={bH}
              fill="var(--accent)" opacity={0.75} rx={2}
            />
            {showYear && (
              <text
                x={x + barW / 2} y={H - PAD.bottom + 14}
                textAnchor="middle" fontSize={9} fill="var(--muted)"
              >
                {d.year}
              </text>
            )}
          </g>
        );
      })}

      {/* Y axis label */}
      <text
        x={10} y={PAD.top + plotH / 2}
        textAnchor="middle" fontSize={9} fill="var(--faint)"
        transform={`rotate(-90, 10, ${PAD.top + plotH / 2})`}
      >
        억원
      </text>
    </svg>
  );
}

const SECTOR_BADGE: Record<string, string> = {
  농업: "badge-green", 보건: "badge-red", 교육: "badge-blue", ICT: "badge-neutral",
};

interface Props {
  countryId: string;
  budget: OdaBudgetResponse | null;
  gaps: OdaGapsResponse | null;
  peer: PeerComparisonResponse | null;
}

export default function OdaTab({ countryId, budget, gaps, peer }: Props) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historySource, setHistorySource] = useState("");

  useEffect(() => {
    if (!countryId) return;
    fetch(`/api/oda/${encodeURIComponent(countryId)}/history`)
      .then((r) => r.json())
      .then((d) => {
        setHistory(d.history ?? []);
        setHistorySource(d.source ?? "");
      })
      .catch(() => {});
  }, [countryId]);

  const total        = budget?.total_억원 ?? budget?.sectors.reduce((s, i) => s + i.budget, 0) ?? 0;
  const projectCount = budget?.sectors.reduce((s, i) => s + i.projects, 0) ?? 0;
  const yoyPct       = budget?.yoy_pct ?? null;

  const budgetItems = (budget?.sectors ?? []).map((s) => ({
    label: s.sector, value: s.budget, unit: "억",
  }));

  const peerItems = (peer?.peers ?? []).map((p) => ({
    label: p.country, value: p.pct, unit: "%",
    highlight: peer?.target.code === p.code,
    color: p.level === "높음" ? "bg-green-500" : p.level === "평균" ? "" : "bg-red-400",
  }));

  return (
    <div className="stack">
      {/* KPI row */}
      <div className="grid-3">
        <div className="kpi-card">
          <span className="kpi-label">연간 KOICA 지원액</span>
          <span className="kpi-value">{Math.round(total).toLocaleString()}<span className="kpi-unit">억원</span></span>
          {yoyPct != null && (
            <span className={`kpi-trend ${yoyPct >= 0 ? "up" : "down"}`}>
              {yoyPct >= 0 ? "↑" : "↓"} 전년 대비 {yoyPct > 0 ? "+" : ""}{yoyPct}%
            </span>
          )}
        </div>
        <div className="kpi-card">
          <span className="kpi-label">진행 중 사업 수</span>
          <span className="kpi-value">{projectCount}<span className="kpi-unit">건</span></span>
          <span className="kpi-trend neutral">분야별 집계</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">데이터 기준연도</span>
          <span className="kpi-value">{budget?.year ?? "—"}<span className="kpi-unit">년</span></span>
          <span className="kpi-trend neutral">KOICA 공개데이터</span>
        </div>
      </div>

      {/* Gap banner */}
      {gaps && <OdaGapBanner data={gaps} />}

      {/* 30년 시계열 차트 */}
      {history.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="card-head">
              <div>
                <p className="card-title">KOICA 연도별 지원 실적 ({history[0].year}–{history[history.length - 1].year})</p>
                <p className="card-meta">단위: 억원 · {history.length}개년 데이터</p>
              </div>
              <span className="badge badge-blue">
                누적 {Math.round(history.reduce((s, d) => s + d.budget_억원, 0)).toLocaleString()}억
              </span>
            </div>
            <OdaHistoryChart history={history} />
            <p className="chart-source">출처: {historySource || "KOICA 국가별 지원실적 (data.go.kr)"}</p>
          </div>
        </div>
      )}

      {/* 분야별 + 유사국 비교 */}
      <div className="grid-2">
        <div className="card">
          <div className="card-body">
            <div className="card-head">
              <div>
                <p className="card-title">분야별 예산 분배</p>
                <p className="card-meta">단위: 억원 · {budget?.year ?? 2023}년</p>
              </div>
              {total > 0 && (
                <span className="badge badge-blue">총 {Math.round(total).toLocaleString()}억</span>
              )}
            </div>
            <HorizontalBarChart items={budgetItems} source="KOICA 공개데이터" />
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="card-head">
              <div>
                <p className="card-title">유사국 비교 ({peer?.sector ?? "분야"} 예산 비중)</p>
                <p className="card-meta">단위: % · 강조 = 현재 국가</p>
              </div>
            </div>
            {peerItems.length > 0 ? (
              <>
                <HorizontalBarChart items={peerItems} maxValue={35} source="외교부 ODA 백서 2023" />
                <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
                  {(["낮음", "평균", "높음"] as const).map((lv) => (
                    <span key={lv} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
                      <span style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                        background: lv === "높음" ? "#10b981" : lv === "평균" ? "var(--accent)" : "#ef4444",
                      }} />
                      {lv}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>유사국 비교 데이터 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

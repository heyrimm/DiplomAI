"use client";

import type { OdaGapsResponse } from "@/types";

interface Props {
  data: OdaGapsResponse;
}

function getSeverity(ratio: number): "critical" | "warning" | "mild" {
  if (ratio < 0.4) return "critical";
  if (ratio < 0.6) return "warning";
  return "mild";
}

const SEV_LABEL: Record<string, string> = { critical: "심각", warning: "주의", mild: "경고" };

export default function OdaGapBanner({ data }: Props) {
  if (data.gaps.length === 0) {
    return (
      <div className="gap-banner success">
        <span className="gap-banner-icon">✅</span>
        <div>
          <p className="gap-banner-title">ODA 사각지대 없음</p>
          <p className="gap-banner-desc">
            모든 분야가 지역 평균의 {100 - data.threshold_percent}% 이상 수준을 유지하고 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="card-head">
          <div>
            <p className="card-title">⚠ ODA 사각지대 경고</p>
            <p className="card-meta">
              지역 유사국 평균 대비 {data.threshold_percent}% 이상 낮은 분야
            </p>
          </div>
        </div>
        <div className="stack">
          {data.gaps.map((gap) => {
            const sev = getSeverity(gap.ratio);
            const badgeCls =
              sev === "critical" ? "badge-red" :
              sev === "warning"  ? "badge-amber" : "badge-neutral";

            return (
              <div
                key={gap.sector}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={`badge ${badgeCls}`}>{SEV_LABEL[sev]}</span>
                  <span style={{ fontWeight: 600, color: "var(--ink-soft)", fontSize: "13.5px" }}>
                    {gap.sector}
                  </span>
                </div>
                <div style={{ textAlign: "right", fontSize: "12.5px" }}>
                  <p style={{ fontWeight: 700, color: "var(--ink)" }}>
                    지역평균의 {Math.round(gap.ratio * 100)}%
                  </p>
                  <p style={{ color: "var(--muted)", marginTop: 2 }}>
                    {gap.current_budget}억 vs 평균 {gap.regional_average}억
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

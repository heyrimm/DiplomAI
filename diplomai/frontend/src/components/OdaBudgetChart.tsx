"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { OdaBudgetResponse } from "@/types";

interface Props {
  data: OdaBudgetResponse;
}

const COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#06b6d4",
  "#10b981", "#f59e0b", "#ef4444", "#ec4899",
];

interface TooltipPayload {
  value: number;
  payload: { projects: number };
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-blue-600">{payload[0].value.toLocaleString()}억원</p>
      <p className="text-xs text-slate-500">{payload[0].payload.projects}개 사업</p>
    </div>
  );
}

export default function OdaBudgetChart({ data }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">ODA 분야별 예산 현황</h2>
          <p className="text-sm text-slate-500">{data.year}년 KOICA 실적 · 단위: 억원</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          총 {data.sectors.reduce((s, i) => s + i.budget, 0).toLocaleString()}억원
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.sectors} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="sector"
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey="budget" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.sectors.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

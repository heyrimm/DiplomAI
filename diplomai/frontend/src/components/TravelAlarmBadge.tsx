"use client";

import type { TravelAlarm } from "@/types";

const COLOR_MAP: Record<string, string> = {
  green:  "bg-green-100 text-green-700 border-green-200",
  blue:   "bg-blue-100 text-blue-700 border-blue-200",
  yellow: "bg-amber-100 text-amber-700 border-amber-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  red:    "bg-red-100 text-red-700 border-red-200",
  gray:   "bg-slate-100 text-slate-600 border-slate-200",
};

export default function TravelAlarmBadge({ alarm }: { alarm: TravelAlarm | null }) {
  if (!alarm) return null;
  const color = COLOR_MAP[alarm.level_color] ?? COLOR_MAP.gray;
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>
      ✈ {alarm.level_label}
    </span>
  );
}

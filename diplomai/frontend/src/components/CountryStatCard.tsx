"use client";

import type { Country } from "@/types";

interface Props {
  country: Country;
}

export default function CountryStatCard({ country }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatItem label="지역" value={country.region} />
      <StatItem label="소득 분류" value={country.income_level} />
      <StatItem
        label="인구"
        value={`${(country.population / 1_000_000).toFixed(1)}M`}
      />
      <StatItem label="1인당 GDP" value={`$${country.gdp_per_capita.toLocaleString()}`} />
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

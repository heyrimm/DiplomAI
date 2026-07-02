"use client";

import type { Country } from "@/types";

interface Props {
  countries: Country[];
  selected: string;
  onChange: (id: string) => void;
}

export default function CountrySelector({ countries, selected, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="country-select" className="text-sm font-medium text-slate-600 whitespace-nowrap">
        분석 국가
      </label>
      <select
        id="country-select"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
      >
        {countries.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.name_en})
          </option>
        ))}
      </select>
    </div>
  );
}

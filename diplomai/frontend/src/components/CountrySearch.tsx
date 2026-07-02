"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { Country } from "@/types";

interface Props {
  selected: Country | null;
  onSelect: (countryId: string) => void;
}

export default function CountrySearch({ selected, onSelect }: Props) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<Country[]>([]);
  const [open, setOpen]         = useState(false);
  const [focused, setFocused]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback((q: string) => {
    api.searchCountries(q).then(setResults).catch(() => setResults([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 180);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  // 초기 추천 목록 로드
  useEffect(() => {
    doSearch("");
  }, [doSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (c: Country) => {
    onSelect(c.id);
    setQuery("");
    setOpen(false);
    setFocused(false);
    inputRef.current?.blur();
  };

  const displayValue = focused ? query : (selected?.name ?? "");

  return (
    <div className={`country-search${open ? " open" : ""}`} ref={ref}>
      <div className="cs-input-wrap">
        <span className="cs-search-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
        <input
          ref={inputRef}
          className="cs-input"
          value={displayValue}
          placeholder="국가 검색 (한국어·영어)"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); setQuery(""); }}
        />
        {selected && !focused && (
          <span className="cs-region-badge">{selected.region}</span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="cs-dropdown">
          {!query && (
            <li className="cs-dropdown-header">
              KOICA 지원 실적 순 ({results.length}개국)
            </li>
          )}
          {query && <li className="cs-dropdown-header">검색 결과</li>}
          {results.map((c) => (
            <li
              key={c.id}
              className={`cs-option${selected?.id === c.id ? " active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
            >
              <span className="cs-option-name">{c.name}</span>
              <span className="cs-option-meta">
                {c.name_en && <span>{c.name_en}</span>}
                {c.region && <span> · {c.region}</span>}
                {c.income_level && <span> · {c.income_level}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

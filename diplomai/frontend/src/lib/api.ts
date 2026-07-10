import type {
  Country,
  OdaBudgetResponse,
  OdaGapsResponse,
  RecommendationsResponse,
  PeerComparisonResponse,
  DiplomacyResponse,
  TravelAlarm,
  SafetyNoticesResponse,
  AlarmHistoryResponse,
  Recommendation,
  ReportGenerateResponse,
  EvaluateResult,
  EntryGuideResult,
} from "@/types";

const BASE = "/api";

async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "API 요청 실패");
  }
  return res.json();
}

export const api = {
  getCountries: () => fetcher<Country[]>("/countries/"),

  searchCountries: (q: string) =>
    fetcher<Country[]>(`/countries/search?q=${encodeURIComponent(q)}`),

  getCountry: (id: string) =>
    fetcher<Country>(`/countries/${encodeURIComponent(id)}`),

  getOdaBudget: (countryId: string) =>
    fetcher<OdaBudgetResponse>(`/oda/${encodeURIComponent(countryId)}/budget`),

  getOdaGaps: (countryId: string) =>
    fetcher<OdaGapsResponse>(`/oda/${encodeURIComponent(countryId)}/gaps`),

  getRecommendations: (countryId: string) =>
    fetcher<RecommendationsResponse>("/ai/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country_id: countryId }),
    }),

  evaluateItem: (
    countryId: string,
    payload: { item?: string; pdfBase64?: string; pdfName?: string },
  ) =>
    fetcher<EvaluateResult>("/ai/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country_id: countryId,
        item: payload.item,
        pdf_base64: payload.pdfBase64,
        pdf_name: payload.pdfName,
      }),
    }),

  getEntryGuide: (countryId: string, item: string, sector?: string) =>
    fetcher<EntryGuideResult>("/ai/entry-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country_id: countryId, item, sector }),
    }),

  getPeerComparison: (countryId: string) =>
    fetcher<PeerComparisonResponse>(`/oda/${encodeURIComponent(countryId)}/peer-comparison`),

  getDiplomacy: (countryId: string) =>
    fetcher<DiplomacyResponse>(`/diplomacy/${encodeURIComponent(countryId)}`),

  getTravelAlarm: (countryId: string) =>
    fetcher<TravelAlarm>(`/safety/${encodeURIComponent(countryId)}/alarm`),

  getSafetyNotices: (countryId: string) =>
    fetcher<SafetyNoticesResponse>(`/safety/${encodeURIComponent(countryId)}/notices`),

  getAlarmHistory: (countryId: string) =>
    fetcher<AlarmHistoryResponse>(`/safety/${encodeURIComponent(countryId)}/alarm-history`),

  generateReport: (params: {
    country_id: string;
    sections: string[];
    mode?: "summary" | "plan";
    base_recommendation?: Recommendation | null;
  }) =>
    fetcher<ReportGenerateResponse>("/report/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }),
};

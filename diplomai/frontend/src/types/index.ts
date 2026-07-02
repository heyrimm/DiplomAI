export interface Country {
  id: string;
  name: string;
  name_en: string;
  region: string;
  income_level: string;
  population: number;
  gdp_per_capita: number;
  hdi: number;
  // 협력국 통합 개발 지표 실데이터
  internet_usage?: number | null;
  corruption_score?: number | null;
  gii?: number | null;
}

export interface SectorBudget {
  sector: string;
  budget: number;
  projects: number;
  sdg_goals?: string[];
}

export interface OdaBudgetResponse {
  country_id: string;
  currency: string;
  year: number;
  total_억원?: number;
  yoy_pct?: number | null;
  sectors: SectorBudget[];
  source?: string;
}

export interface OdaGap {
  sector: string;
  current_budget: number;
  regional_average: number;
  ratio: number;
  gap_percent: number;
}

export interface OdaGapsResponse {
  country_id: string;
  region: string;
  threshold_percent: number;
  gaps: OdaGap[];
}

export interface Recommendation {
  title: string;
  sector: string;
  budget_estimate: string;
  duration: string;
  rationale: string;
  expected_impact: string;
  priority: "high" | "medium" | "low";
  sdg?: string[];
}

export interface RecommendationsResponse {
  country_id: string;
  country_name: string;
  recommendations: Recommendation[];
}

export interface PeerEntry {
  country: string;
  code: string;
  pct: number;
  level: "낮음" | "평균" | "높음";
}

export interface PeerComparisonResponse {
  target: { name: string; code: string };
  sector: string;
  peers: PeerEntry[];
}

export interface DiplomacyChannel {
  label: string;
  score: number;
}

export interface DiplomacyTrend {
  label: string;
  value: string;
}

export interface DiplomacyTimeline {
  year: string;
  event: string;
  detail: string;
  tag: string;
}

export interface TravelAlarm {
  country_id: string;
  country_name: string;
  level: string;
  level_label: string;
  level_color: string;
  remark: string;
  updated_at: string;
  source: string;
}

export interface SafetyNotice {
  title: string;
  date: string;
  url: string;
}

export interface SafetyNoticesResponse {
  country_id: string;
  notices: SafetyNotice[];
  source: string;
}

export interface DiplomacyResponse {
  country_id: string;
  kf_index: number;
  korean_learners: number;
  tourists: number;
  learners_yoy: number;
  tourists_yoy: number;
  rank_in_region: string;
  channels: DiplomacyChannel[];
  trends: DiplomacyTrend[];
  timeline: DiplomacyTimeline[];
  ai_insight: string;
}

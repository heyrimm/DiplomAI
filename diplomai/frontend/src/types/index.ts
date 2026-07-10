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
  type?: "oda" | "diplomacy";
  data_citation?: string;
}

export interface RecommendationsResponse {
  country_id: string;
  country_name: string;
  recommendations: Recommendation[];
}

export interface EvalComponent {
  label: string;
  score: number;
  max: number;
  note: string;
}

export interface EvaluateResult {
  country_id: string;
  item: string;
  source?: "text" | "pdf";
  sector: string;
  score: number;
  grade: string;
  components: EvalComponent[];
  summary: string;
  strengths: string[];
  risks: string[];
  reasoning: string;
  similar_precedents: string[];
  adjustments: string[];
  cached?: boolean;
}

export interface EntryGuideStep {
  order: number;
  title: string;
  description: string;
  agency?: string;
  duration?: string;
}

export interface EntryGuideNews {
  date: string;
  category: string;
  title: string;
  summary: string;
  office: string;
  url: string;
}

export interface EntryGuideNation {
  sections: Record<string, string>;
  offices?: { name: string; contact: string }[];
  source?: string;
}

export interface EntryGuideDifficulty {
  level: string;
  reason: string;
}

export interface EntryGuideResult {
  country_id: string;
  item: string;
  overview: string;
  difficulty?: EntryGuideDifficulty | null;
  key_risks?: string[];
  first_actions?: string[];
  total_duration?: string;
  must_check?: string[];
  steps: EntryGuideStep[];
  customs: string[];
  legal: string[];
  practices: string[];
  resources: string[];
  data_sources?: string[];
  nation?: EntryGuideNation | null;
  news?: EntryGuideNews[];
  cached?: boolean;
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
  updated_at: string | null;
  source: string;
  is_fallback?: boolean;
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

export interface AlarmHistoryItem {
  title: string;
  date: string;
  summary: string;
  file_url: string;
}

export interface AlarmHistoryResponse {
  country_id: string;
  history: AlarmHistoryItem[];
  source: string;
}

export interface SejongYearCount {
  year: string;
  count: number;
}

export interface PlanActivity {
  name: string;
  description: string;
}

export interface PlanBudgetItem {
  item: string;
  amount: string;
}

export interface PlanKpi {
  indicator: string;
  target: string;
}

export interface PlanRisk {
  risk: string;
  mitigation: string;
}

export interface ProjectPlan {
  title: string;
  type?: "oda" | "diplomacy";
  background: string;
  objectives: string[];
  target_beneficiaries: string;
  activities: PlanActivity[];
  budget_plan: PlanBudgetItem[];
  duration?: string;
  kpis: PlanKpi[];
  risks: PlanRisk[];
  data_citations?: string[];
}

export interface ReportGenerateResponse {
  country_id: string;
  mode: "summary" | "plan";
  executive_summary?: string;
  plan?: ProjectPlan;
  model?: string;
  travel_alarm?: string;
  cached?: boolean;
}

export interface KoreanStudies {
  universities: number;
  bachelor: number;
  master: number;
  doctoral: number;
  sejong: number;
  korea_corner: number;
}

export interface KfProjects {
  total: number;
  first_year: number | null;
  last_year: number | null;
  recent: { name: string; year: string }[];
}

export interface AfricaExchanges {
  total: number;
  cases: {
    province: string;
    city: string;
    partner: string;
    year: string;
    type: string;
    desc: string;
  }[];
}

export interface KfGap {
  is_gap: boolean;
  reason: string;
}

export interface DiplomacyResponse {
  country_id: string;
  kf_index: number | null;
  korean_learners: number | null;
  learners_yoy: number | null;
  diaspora_count: number | null;
  embassy_count: number | null;
  embassy_source_type?: "api" | "fallback" | "unavailable";
  sejong_history: SejongYearCount[] | null;
  korean_studies?: KoreanStudies | null;
  kf_projects?: KfProjects | null;
  africa_exchanges?: AfricaExchanges | null;
  kf_gap?: KfGap | null;
  tourists: number | null;
  tourists_yoy: number | null;
  rank_in_region: string;
  channels: DiplomacyChannel[];
  trends: DiplomacyTrend[];
  timeline: DiplomacyTimeline[];
  ai_insight: string;
  data_sources?: string[];
}

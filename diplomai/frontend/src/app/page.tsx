"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type {
  Country,
  OdaBudgetResponse,
  OdaGapsResponse,
  Recommendation,
  PeerComparisonResponse,
  DiplomacyResponse,
  TravelAlarm,
  SafetyNoticesResponse,
} from "@/types";

import Sidebar from "@/components/Sidebar";
import CountrySearch from "@/components/CountrySearch";
import CountryHeader from "@/components/CountryHeader";
import { type TabId } from "@/components/TabNav";
import OverviewTab from "@/components/tabs/OverviewTab";
import OdaTab from "@/components/tabs/OdaTab";
import DiplomacyTab from "@/components/tabs/DiplomacyTab";
import SimulationTab from "@/components/tabs/SimulationTab";
import ReportTab from "@/components/tabs/ReportTab";
import AiRecommendationCards from "@/components/AiRecommendationCards";
import CountryLanding from "@/components/CountryLanding";
import GlobalDashboard from "@/components/GlobalDashboard";
import BusinessEvaluator from "@/components/BusinessEvaluator";
import MarketInfo from "@/components/MarketInfo";
import Landing from "@/components/Landing";
import { ChevronLeft, ChevronRight, HelpCircle, Bell } from "@/components/icons";

const TAB_LABELS: Record<TabId, string> = {
  global:     "글로벌 현황",
  overview:   "종합 개요",
  market:     "시장정보",
  oda:        "ODA 분석",
  diplomacy:  "공공외교",
  evaluate:   "사업 진단",
  simulation: "예산 시뮬레이션",
  report:     "보고서·계획서",
};

export default function Home() {
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [country, setCountry]         = useState<Country | null>(null);
  const [budget, setBudget]           = useState<OdaBudgetResponse | null>(null);
  const [gaps, setGaps]               = useState<OdaGapsResponse | null>(null);
  const [peer, setPeer]               = useState<PeerComparisonResponse | null>(null);
  const [diplomacy, setDiplomacy]     = useState<DiplomacyResponse | null>(null);
  const [alarm, setAlarm]             = useState<TravelAlarm | null>(null);
  const [safetyNotices, setSafetyNotices] = useState<SafetyNoticesResponse | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRec, setLoadingRec]   = useState(false);
  const [planBaseIndex, setPlanBaseIndex] = useState(-1);
  const [planSeed, setPlanSeed]       = useState<Recommendation | null>(null);
  const [activeTab, setActiveTab]     = useState<TabId>("overview");
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [entered, setEntered]         = useState(false);
  const [toast, setToast]             = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // 국가별 탭은 국가 선택이 필요 — 미선택 시 toast 안내
  const NEED_COUNTRY: TabId[] = ["market", "oda", "diplomacy", "evaluate", "report"];
  const handleNav = (id: TabId) => {
    if (NEED_COUNTRY.includes(id) && !selectedId) {
      setToast(null);
      requestAnimationFrame(() => setToast("국가를 먼저 선택해주세요"));
      return;
    }
    setActiveTab(id);
  };

  const loadCountryData = useCallback(async (id: string | null) => {
    if (!id) return;
    // 즉시 초기화 → 이전 국가 데이터가 새 국가 UI에 남지 않음
    setCountry(null);
    setBudget(null);
    setGaps(null);
    setPeer(null);
    setDiplomacy(null);
    setAlarm(null);
    setSafetyNotices(null);
    setRecommendations([]);
    setPlanBaseIndex(-1);
    setPlanSeed(null);
    setError(null);
    setLoading(true);

    try {
      const [c, b, g, p, d, al, sn] = await Promise.all([
        api.getCountry(id),
        api.getOdaBudget(id),
        api.getOdaGaps(id),
        api.getPeerComparison(id),
        api.getDiplomacy(id),
        api.getTravelAlarm(id),
        api.getSafetyNotices(id),
      ]);
      setCountry(c);
      setBudget(b);
      setGaps(g);
      setPeer(p);
      setDiplomacy(d);
      setAlarm(al);
      setSafetyNotices(sn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (selectedId) loadCountryData(selectedId); }, [selectedId, loadCountryData]);

  const handleCountrySelect = (id: string) => {
    setSelectedId(id);
    setActiveTab("overview");
  };

  const handleGenerateRecommendations = async () => {
    if (!selectedId) return;
    setLoadingRec(true);
    try {
      const res = await api.getRecommendations(selectedId);
      setRecommendations(res.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 추천 생성 실패");
    } finally {
      setLoadingRec(false);
    }
  };

  // 추천 카드 → 계획서 생성 원클릭 연결
  const handleSelectForPlan = (index: number) => {
    setPlanSeed(null);
    setPlanBaseIndex(index);
    setActiveTab("report");
  };

  // 사업 진단 결과 → 계획서 생성 원클릭 연결 (진단한 내 아이템을 기반으로)
  const handleBuildPlanFromEval = (seed: Recommendation) => {
    setPlanBaseIndex(-1);
    setPlanSeed(seed);
    setActiveTab("report");
  };

  const totalBudget = budget?.total_억원 ?? 0;
  const yoyPct      = budget?.yoy_pct ?? null;
  const riskScore   = country ? Math.round((1 - country.hdi) * 100) : null;

  // 최초 진입 랜딩 — 클릭 시 앱 진입 (recommend: 국가 추천 인테이크 / browse: 국가 목록)
  if (!entered) {
    return (
      <Landing
        onEnter={() => {
          setEntered(true);
          setActiveTab("global");
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* ── Side rail ── */}
      <Sidebar
        countries={[]}
        selectedId={selectedId}
        activeNav={activeTab}
        onCountryChange={handleCountrySelect}
        onNavChange={(id) => handleNav(id as TabId)}
        onHome={() => { setSelectedId(null); setActiveTab("overview"); }}
      />

      {/* ── Main area ── */}
      <div className="main-wrap">

        {/* Sticky top nav */}
        <header className="app-nav">
          {/* Breadcrumb */}
          <div className="breadcrumb">
            <div className="crumb-btns">
              <button className="crumb-btn" aria-label="뒤로"><ChevronLeft size={15} /></button>
              <button className="crumb-btn" aria-label="앞으로"><ChevronRight size={15} /></button>
            </div>
            <div className="crumb-trail">
              <button
                className="crumb-muted crumb-home"
                onClick={() => setSelectedId(null)}
                title="첫 화면으로"
              >
                분석
              </button>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">{TAB_LABELS[activeTab]}</span>
            </div>
          </div>

          {/* 국가 검색창 */}
          <CountrySearch selected={country} onSelect={handleCountrySelect} />

          {/* Action icons */}
          <div className="nav-actions">
            <button className="nav-icon-btn" aria-label="도움말"><HelpCircle size={17} /></button>
            <button className="nav-icon-btn" aria-label="알림"><Bell size={17} /></button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="page-content">

          {/* 에러 배너 */}
          {error && (
            <div className="error-banner">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── 글로벌 현황 (전세계 대시보드) ── */}
          {activeTab === "global" && (
            <div className="content-area">
              <div className="tab-page-header">
                <h2 className="tab-page-title">글로벌 현황</h2>
                <span className="tab-page-sub">전세계 KOICA·세종학당·여행경보 종합</span>
              </div>
              <GlobalDashboard
                onSelectCountry={(id) => {
                  setSelectedId(id);
                  setActiveTab("overview");
                }}
              />
            </div>
          )}

          {/* 국가 미선택 → 국가 목록 */}
          {activeTab !== "global" && !selectedId && !loading && (
            <CountryLanding onSelect={handleCountrySelect} />
          )}

          {/* 로딩 상태 */}
          {loading && activeTab !== "global" && (
            <div className="loading-state">
              <span className="spinner" />
              <span>{selectedId} 데이터 로딩 중…</span>
            </div>
          )}

          {/* ── 종합 개요 탭: 국가 헤더 + 메트릭 리본 + 개요 콘텐츠 ── */}
          {activeTab === "overview" && country && (
            <>
              <CountryHeader
                country={country}
                riskCount={gaps?.gaps.length ?? 0}
                recommendCount={recommendations.length}
                alarm={alarm}
                koicaBudget={totalBudget}
                koicaYoy={yoyPct}
              />

              <div className="content-area">
                <OverviewTab
                  country={country}
                  budget={budget}
                  gaps={gaps}
                  recommendations={recommendations}
                  alarm={alarm}
                  safetyNotices={safetyNotices}
                />
              </div>

              <div id="ai-recommend">
                <AiRecommendationCards
                  recommendations={recommendations}
                  loading={loadingRec}
                  onGenerate={handleGenerateRecommendations}
                  onSelectForPlan={handleSelectForPlan}
                  countryName={country.name}
                />
              </div>
            </>
          )}

          {/* ── 시장정보 탭 ── */}
          {activeTab === "market" && (
            <div className="content-area">
              {country ? (
                <>
                  <div className="tab-page-header">
                    <h2 className="tab-page-title">시장정보 — {country.name}</h2>
                    <span className="tab-page-sub">World Bank 거시지표 · KOTRA 국가정보 · 사업 맞춤 브리핑</span>
                  </div>
                  <MarketInfo country={country} />
                </>
              ) : !loading && (
                <div className="empty-state">국가를 먼저 선택하세요</div>
              )}
            </div>
          )}

          {/* ── ODA 탭 ── */}
          {activeTab === "oda" && (
            <div className="content-area">
              {country ? (
                <>
                  <div className="tab-page-header">
                    <h2 className="tab-page-title">ODA 예산 분석 — {country.name}</h2>
                    <span className="tab-page-sub">KOICA 국가별 지원실적 · {budget?.year ?? 2023}년</span>
                  </div>
                  <OdaTab countryId={selectedId ?? ""} budget={budget} gaps={gaps} peer={peer} />
                  <div id="ai-recommend">
                    <AiRecommendationCards
                      recommendations={recommendations}
                      loading={loadingRec}
                      onGenerate={handleGenerateRecommendations}
                      onSelectForPlan={handleSelectForPlan}
                      countryName={country.name}
                    />
                  </div>
                </>
              ) : !loading && (
                <div className="empty-state">국가를 먼저 선택하세요</div>
              )}
            </div>
          )}

          {/* ── 공공외교 탭 ── */}
          {activeTab === "diplomacy" && (
            <div className="content-area">
              {country ? (
                <>
                  <div className="tab-page-header">
                    <h2 className="tab-page-title">공공외교 현황 — {country.name}</h2>
                    <span className="tab-page-sub">세종학당재단 · 외교부 재외동포현황 · data.go.kr 재외공관 API</span>
                  </div>
                  <DiplomacyTab data={diplomacy} />
                </>
              ) : !loading && (
                <div className="empty-state">국가를 먼저 선택하세요</div>
              )}
            </div>
          )}

          {/* ── 사업 진단 탭 ── */}
          {activeTab === "evaluate" && (
            <div className="content-area">
              {country ? (
                <>
                  <div className="tab-page-header">
                    <h2 className="tab-page-title">사업 타당성 진단 — {country.name}</h2>
                    <span className="tab-page-sub">내 사업 아이템을 공공데이터로 평가 · 가능성 점수 산출</span>
                  </div>
                  <BusinessEvaluator country={country} onBuildPlan={handleBuildPlanFromEval} />
                </>
              ) : !loading && (
                <div className="empty-state">국가를 먼저 선택하세요</div>
              )}
            </div>
          )}

          {/* ── 시뮬레이션 탭 ── */}
          {activeTab === "simulation" && (
            <div className="content-area">
              <div className="tab-page-header">
                <h2 className="tab-page-title">ODA 시뮬레이션{country ? ` — ${country.name}` : ""}</h2>
                <span className="tab-page-sub">예산 배분 시나리오 분석</span>
              </div>
              <SimulationTab countryId={selectedId} />
            </div>
          )}

          {/* ── 보고서 탭 ── */}
          {activeTab === "report" && (
            <div className="content-area">
              {country ? (
                <>
                  <div className="tab-page-header">
                    <h2 className="tab-page-title">보고서 · 사업계획서 — {country.name}</h2>
                    <span className="tab-page-sub">근거 인용 사업계획서 초안 생성 · 분석 보고서 · 인쇄/PDF</span>
                  </div>
                  <ReportTab
                    country={country}
                    budget={budget}
                    gaps={gaps}
                    diplomacy={diplomacy}
                    recommendations={recommendations}
                    planBaseIndex={planBaseIndex}
                    planSeed={planSeed}
                  />
                </>
              ) : !loading && (
                <div className="empty-state">국가를 먼저 선택하세요</div>
              )}
            </div>
          )}

        </main>
      </div>

      {country && (activeTab === "overview" || activeTab === "oda") && (
        <button
          className="fab-recommend"
          onClick={() => {
            document.getElementById("ai-recommend")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          aria-label="AI 사업 추천으로 이동"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" fill="currentColor" />
            <circle cx="18.5" cy="17.5" r="2.4" fill="currentColor" opacity="0.85" />
            <circle cx="5.5" cy="16.5" r="1.6" fill="currentColor" opacity="0.7" />
          </svg>
          <span>AI 사업 추천</span>
        </button>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

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
import TabNav, { type TabId } from "@/components/TabNav";
import OverviewTab from "@/components/tabs/OverviewTab";
import OdaTab from "@/components/tabs/OdaTab";
import DiplomacyTab from "@/components/tabs/DiplomacyTab";
import SimulationTab from "@/components/tabs/SimulationTab";
import ReportTab from "@/components/tabs/ReportTab";
import AiRecommendationCards from "@/components/AiRecommendationCards";

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
  const [activeTab, setActiveTab]     = useState<TabId>("overview");
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

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

  const totalBudget = budget?.total_억원 ?? 0;
  const yoyPct      = budget?.yoy_pct ?? null;
  const riskScore   = country ? Math.round((1 - country.hdi) * 100) : null;

  return (
    <div className="app-shell">
      {/* ── Side rail ── */}
      <Sidebar
        countries={[]}
        selectedId={selectedId}
        activeNav={activeTab}
        onCountryChange={handleCountrySelect}
        onNavChange={(id) => setActiveTab(id as TabId)}
      />

      {/* ── Main area ── */}
      <div className="main-wrap">

        {/* Sticky top nav */}
        <header className="app-nav">
          <div className="brand-mark">
            <span className="brand-icon">D</span>
            DiplomAI
          </div>

          {/* 국가 검색창 */}
          <CountrySearch selected={country} onSelect={handleCountrySelect} />

          <TabNav active={activeTab} onChange={setActiveTab} />
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

          {/* 국가 미선택 웰컴 화면 */}
          {!selectedId && !loading && (
            <div className="welcome-state">
              <div className="welcome-icon">🌏</div>
              <h2 className="welcome-title">분석할 국가를 검색하세요</h2>
              <p className="welcome-desc">
                KOICA 지원 실적이 있는 <strong>150개+ 국가</strong>를 검색할 수 있습니다.<br />
                상단 검색창에 나라 이름을 입력하거나 추천 목록에서 선택하세요.
              </p>
              <p className="welcome-hint">예: 인도네시아 · 베트남 · 케냐 · 볼리비아</p>
            </div>
          )}

          {/* 로딩 상태 */}
          {loading && (
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
              />

              <div className="metric-ribbon">
                <div className="metric-cell">
                  <span className="m-label">KOICA 연간 지원</span>
                  <span className="m-value">
                    {totalBudget > 0 ? `${Math.round(totalBudget)}억` : "—"}
                  </span>
                  {yoyPct != null && (
                    <span className={`m-sub ${yoyPct >= 0 ? "up" : "down"}`}>
                      {yoyPct >= 0 ? "↑" : "↓"} 전년 대비 {yoyPct > 0 ? "+" : ""}{yoyPct}%
                    </span>
                  )}
                </div>

                <div className="metric-cell">
                  <span className="m-label">리스크 스코어</span>
                  <span className="m-value">{riskScore ?? "—"}<span style={{fontSize:13,fontWeight:400,color:"var(--muted)"}}>/100</span></span>
                  <span className="m-sub neutral">HDI 기반 산출</span>
                </div>

                {diplomacy?.kf_index != null ? (
                  <div className="metric-cell">
                    <span className="m-label">KF 공공외교 지수</span>
                    <span className="m-value">{diplomacy.kf_index}<span style={{fontSize:13,fontWeight:400,color:"var(--muted)"}}>/100</span></span>
                    <span className="m-sub neutral">{diplomacy.rank_in_region}</span>
                  </div>
                ) : (
                  <div className="metric-cell">
                    <span className="m-label">KF 공공외교 지수</span>
                    <span className="m-value">—</span>
                    <span className="m-sub neutral">데이터 없음</span>
                  </div>
                )}

                <div className="metric-cell">
                  <span className="m-label">HDI</span>
                  <span className="m-value">{country.hdi}</span>
                  <span className="m-sub neutral">{country.income_level}</span>
                </div>
              </div>

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

              <AiRecommendationCards
                recommendations={recommendations}
                loading={loadingRec}
                onGenerate={handleGenerateRecommendations}
                countryName={country.name}
              />
            </>
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
                  <OdaTab countryId={selectedId} budget={budget} gaps={gaps} peer={peer} />
                  <AiRecommendationCards
                    recommendations={recommendations}
                    loading={loadingRec}
                    onGenerate={handleGenerateRecommendations}
                    countryName={country.name}
                  />
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
                    <span className="tab-page-sub">KF 공공외교 통계 · 세종학당재단 연차보고서</span>
                  </div>
                  <DiplomacyTab data={diplomacy} />
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
              <SimulationTab />
            </div>
          )}

          {/* ── 보고서 탭 ── */}
          {activeTab === "report" && (
            <div className="content-area">
              {country ? (
                <>
                  <div className="tab-page-header">
                    <h2 className="tab-page-title">종합 보고서 — {country.name}</h2>
                    <span className="tab-page-sub">ODA · 공공외교 · AI 추천 종합</span>
                  </div>
                  <ReportTab
                    country={country}
                    budget={budget}
                    gaps={gaps}
                    diplomacy={diplomacy}
                    recommendations={recommendations}
                  />
                </>
              ) : !loading && (
                <div className="empty-state">국가를 먼저 선택하세요</div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

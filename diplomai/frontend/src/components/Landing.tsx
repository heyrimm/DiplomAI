"use client";

import { flagSrc } from "@/lib/flags";

interface Props {
  onEnter: (mode: "recommend" | "browse") => void;
}

/* 궤도에 띄울 국기 (중앙 텍스트 영역을 피해 배치) */
const ORBIT: { id: string; top: string; left: string }[] = [
  { id: "베트남",     top: "10%", left: "24%" },
  { id: "인도네시아", top: "24%", left: "9%"  },
  { id: "케냐",       top: "50%", left: "4%"  },
  { id: "몽골",       top: "76%", left: "13%" },
  { id: "에티오피아", top: "90%", left: "29%" },
  { id: "이집트",     top: "10%", left: "72%" },
  { id: "필리핀",     top: "24%", left: "89%" },
  { id: "페루",       top: "50%", left: "94%" },
  { id: "우간다",     top: "76%", left: "85%" },
  { id: "모로코",     top: "90%", left: "69%" },
];

export default function Landing({ onEnter }: Props) {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-brand">
          <span className="lp-brand-icon">D</span>
          <span className="lp-brand-name">DiplomAI</span>
        </div>
        <button className="lp-nav-btn" onClick={() => onEnter("browse")}>시작하기</button>
      </header>

      <section className="lp-hero">
        <div className="lp-ring lp-ring-1" />
        <div className="lp-ring lp-ring-2" />
        <div className="lp-ring lp-ring-3" />

        {ORBIT.map((o) => (
          <span key={o.id} className="lp-flag" style={{ top: o.top, left: o.left }} title={o.id}>
            {flagSrc(o.id) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flagSrc(o.id)!} alt={o.id} />
            ) : (
              "🏳️"
            )}
          </span>
        ))}

        <div className="lp-hero-inner">
          <span className="lp-eyebrow">
            <span className="lp-eyebrow-dot" />
            외교부·KOICA·KF·한아프리카재단 공공데이터 융합
          </span>
          <h1 className="lp-title">
            당신의 사업,<br />어디로 진출할까요?
          </h1>
          <p className="lp-sub">본인의 사업을 진출할 수 있는 최고의 국가를 추천해드립니다</p>
          <div className="lp-cta">
            <button className="lp-btn-primary" onClick={() => onEnter("recommend")}>국가 추천 받기</button>
            <button className="lp-btn-ghost" onClick={() => onEnter("browse")}>둘러보기</button>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;            // ms
  className?: string;
  format?: (n: number) => string;
}

/** 이전 값 → 새 값으로 부드럽게 올라가는 숫자 애니메이션 (easeOutCubic) */
export default function CountUp({ value, duration = 1000, className, format }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) { setDisplay(to); return; }
    let startTs: number | null = null;

    const step = (ts: number) => {
      if (startTs === null) startTs = ts;
      const p = Math.min(1, (ts - startTs) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(to);
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const text = format ? format(display) : Math.round(display).toLocaleString();
  return <span className={className}>{text}</span>;
}

/**
 * AI 출력의 [[수치|출처]] 인용 마커를 하이라이트로 렌더링.
 * hover 시 출처 tooltip 표시. 출처(|) 없는 [[텍스트]]는 브래킷만 제거해 일반 텍스트로.
 */

// [[텍스트]] 또는 [[텍스트|출처]] 모두 매칭 (출처는 선택)
const CITE_RE = /\[\[([^|\]]+?)(?:\|([^\]]+))?\]\]/g;

/** Markdown 다운로드 등 순수 텍스트가 필요할 때 마커 제거 */
export function stripCites(text: string): string {
  return text.replace(CITE_RE, "$1");
}

export default function CitedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(CITE_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const label = m[1].trim();
    const source = m[2]?.trim();
    if (source) {
      parts.push(
        <mark key={m.index} className="cite" title={`출처: ${source}`}>
          {label}
        </mark>,
      );
    } else {
      // 출처 없는 인용 — 브래킷 제거 후 일반 텍스트로
      parts.push(label);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/**
 * AI 출력의 [[수치|출처]] 인용 마커를 하이라이트로 렌더링.
 * hover 시 출처 tooltip 표시. 마커가 없으면 일반 텍스트 그대로.
 */

const CITE_RE = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;

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
    parts.push(
      <mark key={m.index} className="cite" title={`출처: ${m[2].trim()}`}>
        {m[1].trim()}
      </mark>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

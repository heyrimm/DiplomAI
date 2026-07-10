/* 국가 id(한국어) → public/flags 파일명 (파일명이 제각각이라 명시 매핑) */
const FLAG_FILES: Record<string, string> = {
  베트남: "vietnam.png",
  이라크: "iraq.png",
  필리핀: "philippines.png",
  캄보디아: "cambodia.png",
  몽골: "mongolia.png",
  인도네시아: "indonesia.png",
  아프가니스탄: "Afghanistan.png",
  에티오피아: "ethiopia.png",
  라오스: "laos.png",
  미얀마: "myanmar.png",
  방글라데시: "Bangladesh.png",
  우즈베키스탄: "uzbekistan.png",
  스리랑카: "Sri Lanka.png",
  탄자니아: "tanzania.png",
  네팔: "Nepal.png",
  파라과이: "Paraguay.png",
  르완다: "rwanda.png",
  페루: "peru.png",
  우간다: "Uganda.png",
  동티모르: "Timor-Leste.png",
  볼리비아: "Bolivia.png",
  콜롬비아: "colombia.png",
  가나: "ghana.png",
  세네갈: "senegal.png",
  케냐: "Kenya.png",
  요르단: "Jordan.png",
  에콰도르: "Ecuador.png",
  "콩고 민주공화국": "Democratic Republic of the Congo.png",
  이집트: "egypt.png",
  모로코: "morocco.png",
};

/* 국가 id → 국기 PNG 경로 (없으면 null) */
export const flagSrc = (id: string | null | undefined): string | null =>
  id && FLAG_FILES[id] ? `/flags/${encodeURI(FLAG_FILES[id])}` : null;

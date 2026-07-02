"use client";

interface BarItem {
  label: string;
  value: number;
  unit?: string;
  highlight?: boolean;
  color?: string;
}

interface Props {
  items: BarItem[];
  maxValue?: number;
  source?: string;
}

/* Map legacy Tailwind color class strings to CSS classes */
function getBarClass(item: BarItem): string {
  if (item.highlight) return "";
  const c = item.color ?? "";
  if (c.includes("green"))  return "success";
  if (c.includes("amber") || c.includes("yellow")) return "warning";
  if (c.includes("red"))    return "danger";
  return "";
}

export default function HorizontalBarChart({ items, maxValue, source }: Props) {
  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <div>
      <div className="bar-list">
        {items.map((item) => {
          const pct = max > 0 ? (item.value / max) * 100 : 0;
          const colorClass = getBarClass(item);

          return (
            <div key={item.label} className="bar-row">
              <span className={`bar-label${item.highlight ? " hl" : ""}`}>
                {item.label}
              </span>
              <div className="bar-track">
                <div
                  className={`bar-fill${colorClass ? ` ${colorClass}` : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`bar-val${item.highlight ? " hl" : ""}`}>
                {item.value.toLocaleString()}{item.unit ?? ""}
              </span>
            </div>
          );
        })}
      </div>
      {source && <p className="chart-source">출처: {source}</p>}
    </div>
  );
}

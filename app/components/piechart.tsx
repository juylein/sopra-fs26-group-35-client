import React from "react";

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  slices: Slice[];
  centerLabel?: string;   // e.g. "total" shown under the number in the donut hole
  showTotal?: boolean;    // whether to show the total number in the hole
  emptyMessage?: string;
}

const COLORS = [
  "#3a5a8b", "#8b1a1a", "#2a7a4a", "#c4903a",
  "#5a5a5a", "#7a3080", "#3a8b7a", "#8b6a1a",
];

const cx = 70;
const cy = 70;
const r = 60;

const PieChart: React.FC<PieChartProps> = ({
  slices,
  centerLabel,
  showTotal = false,
  emptyMessage = "No data yet.",
}) => {
  const filled = slices.filter((s) => s.value > 0);
  const total = filled.reduce((s, e) => s + e.value, 0);

  if (total === 0) {
    return (
      <div className="shelf-empty" style={{ textAlign: "center", paddingTop: 24 }}>
        {emptyMessage}
      </div>
    );
  }

  // Single slice — full circle, no arc math
  const isSingle = filled.length === 1;

  let cumAngle = -Math.PI / 2;
  const paths = filled.map((s, i) => {
    const color = s.color ?? COLORS[i % COLORS.length];

    if (isSingle) {
      return { ...s, color, path: null };
    }

    const angle = (s.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...s, color, path };
  });

  return (
    <div className="stats-genre-body">
      <svg
        viewBox="0 0 140 140"
        style={{ width: "100%", maxWidth: 200, height: "auto", flexShrink: 0 }}
        >
        {paths.map((s, i) =>
          s.path === null ? (
            <circle key={i} cx={cx} cy={cy} r={r} fill={s.color} />
          ) : (
            <path key={i} d={s.path} fill={s.color} stroke="#faf7f2" strokeWidth="2" />
          )
        )}
        {/* Donut hole */}
        <circle cx={cx} cy={cy} r={30} fill="#faf7f2" />
        {showTotal && (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#1a1a1a">
              {total}
            </text>
            {centerLabel && (
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize="7" fill="#7a6e5e">
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>

      <div className="stats-genre-legend">
        {paths.map((s, i) => (
          <div key={i} className="stats-legend-row">
            <div className="stats-legend-dot" style={{ background: s.color }} />
            <span className="stats-legend-label">{s.label}</span>
            <span className="stats-legend-pct">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;
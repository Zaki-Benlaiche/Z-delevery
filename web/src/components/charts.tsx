/** رسوم بيانية خفيفة بـ SVG/CSS خالص — بلا أي مكتبات خارجية.
 *  مصمّمة للوحة قيادة الأدمن: منحنى مساحة، أعمدة، حلقة (دونات)، خطّ مصغّر، وشريط تقدّم.
 *  الرسوم محايدة لغوياً وتُعرض LTR (الزمن من اليسار للأقدم نحو اليمين للأحدث). */
import { useId } from "react";
import { colors } from "../theme";

// ─────────────────────────────────────────────────────────────
//  منحنى مساحة (Area) — لاتجاه الإيراد/الطلبات عبر الزمن
// ─────────────────────────────────────────────────────────────
export function AreaChart({
  data,
  height = 180,
  color = colors.primary,
  fill = true,
  formatY,
}: {
  data: number[];
  height?: number;
  color?: string;
  fill?: boolean;
  formatY?: (v: number) => string;
}) {
  const gid = useId();
  const W = 600;
  const H = height;
  const pad = { top: 12, right: 6, bottom: 6, left: 6 };
  const max = Math.max(1, ...data);
  const n = data.length;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const linePts = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const areaPts = `${pad.left},${H - pad.bottom} ${linePts} ${pad.left + innerW},${H - pad.bottom}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ direction: "ltr", overflow: "visible" }}>
      <defs>
        <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* خطوط شبكة أفقية خفيفة */}
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={pad.left}
          x2={pad.left + innerW}
          y1={pad.top + innerH * t}
          y2={pad.top + innerH * t}
          stroke={colors.borderSoft}
          strokeWidth={1}
        />
      ))}

      {fill && <polygon points={areaPts} fill={`url(#area-${gid})`} />}
      <polyline
        points={linePts}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* نقطة آخر قيمة */}
      {n > 0 && (
        <circle cx={x(n - 1)} cy={y(data[n - 1])} r={4} fill={color} stroke="#fff" strokeWidth={2} />
      )}
      {formatY && (
        <text x={pad.left} y={pad.top - 2} fontSize={11} fill={colors.textFaint} className="chart-label">
          {formatY(max)}
        </text>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
//  أعمدة (Bars) — مع تسميات سفلية اختيارية
// ─────────────────────────────────────────────────────────────
export function BarChart({
  data,
  labels,
  height = 160,
  color = colors.accent,
}: {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(1, ...data);
  return (
    <div style={{ direction: "ltr", display: "flex", alignItems: "flex-end", gap: 4, height }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div
              title={String(v)}
              style={{
                width: "100%",
                height: `${(v / max) * 100}%`,
                minHeight: v > 0 ? 3 : 0,
                background: color,
                borderRadius: "4px 4px 0 0",
                opacity: 0.55 + 0.45 * (v / max),
                transition: "height .3s ease",
              }}
            />
          </div>
          {labels && (
            <span style={{ fontSize: 9, color: colors.textFaint, whiteSpace: "nowrap" }}>{labels[i]}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  حلقة (Donut) — لتوزيع نسبي (مثل حالات الطلبات)
// ─────────────────────────────────────────────────────────────
export function Donut({
  segments,
  size = 160,
  thickness = 22,
  centerLabel,
  centerSub,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ direction: "ltr" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.surface} strokeWidth={thickness} />
      {total > 0 &&
        segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dash;
          return el;
        })}
      {centerLabel && (
        <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.2} fontWeight={800} fill={colors.text}>
          {centerLabel}
        </text>
      )}
      {centerSub && (
        <text x="50%" y="62%" textAnchor="middle" fontSize={size * 0.085} fill={colors.textMuted}>
          {centerSub}
        </text>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
//  خطّ مصغّر (Sparkline) — داخل بطاقات المؤشّرات
// ─────────────────────────────────────────────────────────────
export function Sparkline({ data, color = colors.primary, width = 90, height = 30 }: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(1, ...data);
  const min = Math.min(...data, 0);
  const n = data.length;
  const x = (i: number) => (n <= 1 ? width / 2 : (i / (n - 1)) * width);
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * height;
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ direction: "ltr", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
//  شريط تقدّم بسيط
// ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = colors.primary, height = 8 }: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: colors.surface, borderRadius: 999, height, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .3s ease" }} />
    </div>
  );
}

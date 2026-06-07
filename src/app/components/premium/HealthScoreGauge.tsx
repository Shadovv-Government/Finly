import type { MetricResult } from '../../../lib/healthScore';

interface HealthScoreGaugeProps {
  score: number;
  metrics: MetricResult[];
}

function getLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'Отлично', color: 'text-emerald-500' };
  if (score >= 60) return { text: 'Хорошо', color: 'text-green-500' };
  if (score >= 40) return { text: 'Средне', color: 'text-amber-500' };
  if (score >= 20) return { text: 'Требует внимания', color: 'text-orange-500' };
  return { text: 'Критично', color: 'text-red-500' };
}

const statusColor = (status: string) => {
  switch (status) {
    case 'good': return 'bg-emerald-500';
    case 'warning': return 'bg-amber-500';
    case 'bad': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

const CX = 100, CY = 100;
const R = 80, r = 52;

const SEGMENTS = [
  { a1: -180, a2: -135, fill: '#ef4444' },
  { a1: -135, a2:  -90, fill: '#f97316' },
  { a1:  -90, a2:  -45, fill: '#eab308' },
  { a1:  -45, a2:    0, fill: '#22c55e' },
];

const toRad = (d: number) => d * Math.PI / 180;

function segPath(a1: number, a2: number): string {
  const pt = (a: number, rad: number) => [CX + rad * Math.cos(toRad(a)), CY + rad * Math.sin(toRad(a))] as const;
  const [ox1, oy1] = pt(a1, R);
  const [ox2, oy2] = pt(a2, R);
  const [ix2, iy2] = pt(a2, r);
  const [ix1, iy1] = pt(a1, r);
  return `M ${ox1} ${oy1} A ${R} ${R} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${r} ${r} 0 0 0 ${ix1} ${iy1} Z`;
}

export const HealthScoreGauge = ({ score, metrics }: HealthScoreGaugeProps) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const label = getLabel(clamped);
  // Needle: -180deg (left, score=0) → 0deg (right, score=100)
  const needleRot = -180 + (clamped / 100) * 180;

  return (
    <div className="flex flex-col items-center">
      {/* viewBox crops just the top-half arc + center cap, no overflow-hidden needed */}
      <svg viewBox="0 14 200 92" className="w-48" style={{ height: 88, display: 'block' }}>
        {SEGMENTS.map(({ a1, a2, fill }) => (
          <path key={a1} d={segPath(a1, a2)} fill={fill} />
        ))}
        <g
          style={{
            transform: `rotate(${needleRot + 90}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: 'transform 700ms ease',
          }}
        >
          {/* Dark outline for contrast on any background */}
          <line x1={CX} y1={CY} x2={CX} y2={CY - 66} stroke="rgba(0,0,0,0.25)" strokeWidth="4" strokeLinecap="round" />
          <line x1={CX} y1={CY} x2={CX} y2={CY - 66} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx={CX} cy={CY} r="5" fill="white" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
      </svg>

      <div className={`text-3xl font-bold ${label.color}`}>{clamped}</div>
      <div className={`text-sm font-medium ${label.color} mb-4`}>{label.text}</div>

      {metrics.length > 0 && (
        <div className="w-full space-y-2">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColor(m.status)} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground truncate">{m.name}</span>
                  <span className="font-medium flex-shrink-0 ml-1">{m.subscore}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${statusColor(m.status)}`}
                    style={{ width: `${m.subscore}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

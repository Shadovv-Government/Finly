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

export const HealthScoreGauge = ({ score, metrics }: HealthScoreGaugeProps) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const label = getLabel(clamped);
  const angle = (clamped / 100) * 180;

  return (
    <div className="flex flex-col items-center">
      {/* Half-circle gauge */}
      <div className="relative w-48 h-24 overflow-hidden mb-2">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full"
          style={{
            background: 'conic-gradient(from 180deg, #22c55e 0deg, #eab308 60deg, #f97316 120deg, #ef4444 180deg)',
            mask: 'radial-gradient(circle at 50% 100%, transparent 55%, black 55%)',
            WebkitMask: 'radial-gradient(circle at 50% 100%, transparent 55%, black 55%)',
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 w-0.5 h-20 bg-white shadow-md origin-bottom transition-transform duration-700"
          style={{ transform: `translateX(-50%) rotate(${angle - 90}deg)` }}
        />
        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow" />
      </div>

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

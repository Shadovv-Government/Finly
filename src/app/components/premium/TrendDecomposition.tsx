import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { DecompositionResult } from '../../../lib/seasonality';

interface TrendDecompositionProps {
  data: DecompositionResult;
}

function formatShort(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

export const TrendDecomposition = ({ data }: TrendDecompositionProps) => {
  if (data.data.length < 7) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Недостаточно данных для декомпозиции (нужно ≥ 7 дней)
      </div>
    );
  }

  const chartData = data.data.map((d, i) => ({
    date: new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
    'Данные': Math.round(d.amount * 100) / 100,
    'Тренд': Math.round(data.trend[i]?.amount * 100) / 100,
  }));

  const maxAbs = Math.max(...data.weekdayEffect.map(w => Math.abs(w.value)), 1);

  return (
    <div>
      <h3 className="font-semibold mb-4">Декомпозиция тренда</h3>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gRaw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" fontSize={10} />
          <YAxis fontSize={10} tickFormatter={formatShort} width={40} />
          <Tooltip
            formatter={(v: number) => [`${Math.round(v).toLocaleString('ru-RU')} ₽`, '']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area type="monotone" dataKey="Данные" stroke="#8884d8" fill="url(#gRaw)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="Тренд" stroke="#ef4444" fill="url(#gTrend)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Эффект дней недели</h4>
        <div className="flex gap-1">
          {data.weekdayEffect.map(wd => {
            const barHeight = Math.max(2, (Math.abs(wd.value) / maxAbs) * 40);
            const isPositive = wd.value >= 0;
            return (
              <div key={wd.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {wd.value > 0 ? '+' : ''}{Math.round(wd.value)}
                </span>
                <div
                  className={`w-5 rounded-sm ${isPositive ? 'bg-red-400' : 'bg-green-400'}`}
                  style={{ height: `${barHeight}px` }}
                />
                <span className="text-[10px] text-muted-foreground">{wd.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import type { DayOfWeekSpend } from '../../../db/analytics';

interface DayOfWeekChartProps {
  data: DayOfWeekSpend[];
}

const SHORT_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function formatShort(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toFixed(0);
}

export const DayOfWeekChart = ({ data }: DayOfWeekChartProps) => {
  if (data.length === 0) return null;

  const maxDay = data.reduce((max, d) => d.amount > max.amount ? d : max, data[0]);
  // Reorder Mon–Sun (1,2,3,4,5,6,0)
  const ordered = [1, 2, 3, 4, 5, 6, 0].map(d => ({
    ...data[d],
    label: SHORT_LABELS[d],
  }));

  return (
    <div>
      <h3 className="font-semibold mb-1">Расходы по дням недели</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Пик: <span className="font-medium text-foreground">{data[maxDay.day]?.dayLabel}</span>
        {' — '}{Math.round(maxDay.amount).toLocaleString('ru-RU')} ₽
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={ordered} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" fontSize={11} axisLine={false} tickLine={false} />
          <YAxis fontSize={10} tickFormatter={formatShort} width={36} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: number) => [`${Math.round(v).toLocaleString('ru-RU')} ₽`, '']}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {ordered.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.day === maxDay.day ? '#f97316' : '#a855f766'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

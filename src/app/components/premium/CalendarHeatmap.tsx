import { useMemo } from 'react';
import type { CalendarDay } from '../../../db/premium';

interface CalendarHeatmapProps {
  year: number;
  data: CalendarDay[];
}

const DAY_LABELS = ['', 'Пн', '', 'Ср', '', 'Пт', ''];

function getColor(amount: number, maxAmount: number): string {
  if (amount === 0) return 'bg-muted';
  const intensity = maxAmount > 0 ? amount / maxAmount : 0;
  if (intensity <= 0.25) return 'bg-emerald-200 dark:bg-emerald-900';
  if (intensity <= 0.5) return 'bg-emerald-400 dark:bg-emerald-700';
  if (intensity <= 0.75) return 'bg-emerald-600';
  return 'bg-emerald-800 dark:bg-emerald-400';
}

export const CalendarHeatmap = ({ year, data }: CalendarHeatmapProps) => {
  const { weeks, maxAmount } = useMemo(() => {
    const dataMap = new Map<number, number>();
    for (const d of data) {
      const day = new Date(d.date).setHours(0, 0, 0, 0);
      dataMap.set(day, (dataMap.get(day) || 0) + d.amount);
    }

    const maxA = Math.max(1, ...dataMap.values());
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    const weeks: { date: number; amount: number; inMonth: boolean }[][] = [];

    const cursor = new Date(yearStart);
    const startDay = yearStart.getDay();
    cursor.setDate(cursor.getDate() - (startDay === 0 ? 6 : startDay - 1));

    while (cursor.getTime() < yearEnd.getTime()) {
      const week: { date: number; amount: number; inMonth: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const ts = cursor.getTime();
        const cellDate = new Date(ts);
        week.push({
          date: ts,
          amount: dataMap.get(ts) || 0,
          inMonth: cellDate.getFullYear() === year,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    return { weeks, maxAmount: maxA };
  }, [year, data]);

  return (
    <div>
      <h3 className="font-semibold mb-3">Расходы за {year}</h3>

      <div className="flex gap-1">
        <div className="flex flex-col gap-1 mr-1">
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="w-6 h-3 text-[10px] text-muted-foreground flex items-center justify-center">
              {l}
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`w-3 h-3 rounded-sm ${getColor(day.inMonth ? day.amount : 0, maxAmount)}`}
                    title={day.inMonth
                      ? `${new Date(day.date).toLocaleDateString('ru-RU')}: ${Math.round(day.amount).toLocaleString('ru-RU')} ₽`
                      : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3 justify-end text-[10px] text-muted-foreground">
        <span>Меньше</span>
        <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
        <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
        <div className="w-3 h-3 rounded-sm bg-emerald-600" />
        <div className="w-3 h-3 rounded-sm bg-emerald-800 dark:bg-emerald-400" />
        <span>Больше</span>
      </div>
    </div>
  );
};

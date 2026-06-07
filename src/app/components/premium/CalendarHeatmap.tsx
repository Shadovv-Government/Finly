import { useMemo } from 'react';
import type { CalendarDay } from '../../../db/premium';

interface CalendarHeatmapProps {
  year: number;
  data: CalendarDay[];
}

const DAY_LABELS = ['', 'Пн', '', 'Ср', '', 'Пт', ''];
const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function getColor(amount: number, maxAmount: number): string {
  if (amount === 0) return 'bg-muted';
  const intensity = maxAmount > 0 ? amount / maxAmount : 0;
  if (intensity <= 0.25) return 'bg-amber-100 dark:bg-amber-900/50';
  if (intensity <= 0.5)  return 'bg-amber-300 dark:bg-amber-700';
  if (intensity <= 0.75) return 'bg-orange-400 dark:bg-orange-600';
  return 'bg-red-500 dark:bg-red-500';
}

export const CalendarHeatmap = ({ year, data }: CalendarHeatmapProps) => {
  const { weeks, maxAmount, monthLabels } = useMemo(() => {
    const dataMap = new Map<number, number>();
    for (const d of data) {
      const day = new Date(d.date).setHours(0, 0, 0, 0);
      dataMap.set(day, (dataMap.get(day) || 0) + d.amount);
    }

    const maxA = Math.max(1, ...dataMap.values());
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    const weeksArr: { date: number; amount: number; inMonth: boolean }[][] = [];

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
      weeksArr.push(week);
    }

    // Compute month label positions
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeksArr.forEach((week, wi) => {
      for (const day of week) {
        if (day.inMonth) {
          const month = new Date(day.date).getMonth();
          if (month !== lastMonth) {
            labels.push({ label: MONTH_LABELS[month], weekIndex: wi });
            lastMonth = month;
          }
          break;
        }
      }
    });

    return { weeks: weeksArr, maxAmount: maxA, monthLabels: labels };
  }, [year, data]);

  // Each cell: w-3 (12px) + gap-1 (4px) = 16px per column
  const CELL_WIDTH = 16;

  return (
    <div>
      <h3 className="font-semibold mb-3">Расходы за {year}</h3>

      <div className="flex gap-1">
        {/* Day-of-week labels column */}
        <div className="flex flex-col gap-1 mr-1">
          <div className="h-4" /> {/* spacer for month labels row */}
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="w-6 h-3 text-[10px] text-muted-foreground flex items-center justify-center">
              {l}
            </div>
          ))}
        </div>

        {/* Month labels + week grid */}
        <div className="overflow-x-auto">
          {/* Month labels row */}
          <div
            className="relative h-4 mb-1"
            style={{ width: `${weeks.length * CELL_WIDTH}px` }}
          >
            {monthLabels.map((ml, i) => (
              <span
                key={i}
                className="absolute text-[10px] text-muted-foreground"
                style={{ left: `${ml.weekIndex * CELL_WIDTH}px` }}
              >
                {ml.label}
              </span>
            ))}
          </div>

          {/* Week columns */}
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

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 justify-end text-[10px] text-muted-foreground">
        <span>Меньше</span>
        <div className="w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-900/50" />
        <div className="w-3 h-3 rounded-sm bg-amber-300 dark:bg-amber-700" />
        <div className="w-3 h-3 rounded-sm bg-orange-400" />
        <div className="w-3 h-3 rounded-sm bg-red-500" />
        <span>Больше</span>
      </div>
    </div>
  );
};

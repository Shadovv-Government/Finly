import { MS_PER_DAY } from '../app/constants';

export type Period = '1m' | '3m' | '1y';

export const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '1m', label: 'Месяц', days: 30 },
  { key: '3m', label: 'Квартал', days: 90 },
  { key: '1y', label: 'Год', days: 365 },
];

export function getPeriodRange(period: Period): { start: number; end: number } {
  const now = Date.now();
  const days = PERIODS.find(p => p.key === period)!.days;
  return { start: now - days * MS_PER_DAY, end: now };
}

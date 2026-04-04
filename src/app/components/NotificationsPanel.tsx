import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Target, Bell } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { useBudgets } from '../hooks/useBudgets';
import { useGoals } from '../hooks/useGoals';
import { useAnalytics } from '../hooks/useAnalytics';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationItem {
  id: string;
  type: 'budget-overrun' | 'budget-warning' | 'goal-done' | 'goal-near';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const { budgets } = useBudgets();
  const { goals } = useGoals();
  const { expensesByCategory } = useAnalytics({ period: 'month' });

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    // Budget alerts
    for (const budget of budgets) {
      const spent = expensesByCategory.find(e => e.categoryId === budget.categoryId)?.amount ?? 0;
      const ratio = budget.amount > 0 ? spent / budget.amount : 0;

      if (ratio >= 1) {
        items.push({
          id: `budget-overrun-${budget.categoryId}`,
          type: 'budget-overrun',
          title: 'Бюджет превышен',
          subtitle: `Потрачено ${spent.toLocaleString('ru-RU')} ₽ при лимите ${budget.amount.toLocaleString('ru-RU')} ₽`,
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          iconBg: 'bg-red-100 dark:bg-red-900/30',
        });
      } else if (ratio >= 0.8) {
        items.push({
          id: `budget-warning-${budget.categoryId}`,
          type: 'budget-warning',
          title: 'Бюджет почти исчерпан',
          subtitle: `Использовано ${Math.round(ratio * 100)}% лимита — осталось ${(budget.amount - spent).toLocaleString('ru-RU')} ₽`,
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        });
      }
    }

    // Goal alerts
    for (const goal of goals) {
      if (!goal.isActive) continue;
      const ratio = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;

      if (ratio >= 1) {
        items.push({
          id: `goal-done-${goal.id}`,
          type: 'goal-done',
          title: `Цель достигнута: ${goal.name}`,
          subtitle: `Накоплено ${goal.currentAmount.toLocaleString('ru-RU')} ₽`,
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
          iconBg: 'bg-green-100 dark:bg-green-900/30',
        });
      } else if (ratio >= 0.8) {
        items.push({
          id: `goal-near-${goal.id}`,
          type: 'goal-near',
          title: `Почти у цели: ${goal.name}`,
          subtitle: `Накоплено ${Math.round(ratio * 100)}% — осталось ${(goal.targetAmount - goal.currentAmount).toLocaleString('ru-RU')} ₽`,
          icon: <Target className="w-5 h-5 text-violet-500" />,
          iconBg: 'bg-violet-100 dark:bg-violet-900/30',
        });
      }
    }

    return items;
  }, [budgets, goals, expensesByCategory]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Уведомления">
      <div className="px-4 py-3 pb-8">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Bell className="w-12 h-12 opacity-30" />
            <p className="text-sm">Всё в порядке, уведомлений нет</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {notifications.map(item => (
              <li key={item.id} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/50">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.iconBg}`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
};

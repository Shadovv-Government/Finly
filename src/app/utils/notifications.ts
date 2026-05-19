// Сервис для управления Push-уведомлениями

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// Запрос разрешения на уведомления
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Браузер не поддерживает уведомления');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

// Проверка поддержки уведомлений
export function isSupported(): boolean {
  return 'Notification' in window;
}

// Проверка наличия разрешения
export function hasPermission(): boolean {
  return Notification.permission === 'granted';
}

// Отправка уведомления
export function sendNotification(options: NotificationOptions): void {
  if (!isSupported()) {
    console.warn('Уведомления не поддерживаются');
    return;
  }

  if (!hasPermission()) {
    console.warn('Нет разрешения на уведомления');
    return;
  }

  const { title, body, icon, badge, tag, requireInteraction } = options;

  const notification = new Notification(title, {
    body,
    icon: icon || '/favicon.svg',
    badge: badge || '/favicon.svg',
    tag: tag || 'finly-notification',
    requireInteraction: requireInteraction || false,
  });

  // Автозакрытие через 5 секунд
  setTimeout(() => notification.close(), 5000);
}

// Отправка финансового уведомления
export function sendTransactionNotification(
  type: 'income' | 'expense' | 'goal',
  amount: number,
  description: string
): void {
  const titles = {
    income: 'Доход',
    expense: 'Расход',
    goal: 'Пополнение цели',
  };

  sendNotification({
    title: titles[type],
    body: `${description} — ${amount.toLocaleString('ru-RU')} ₽`,
    tag: `transaction-${Date.now()}`,
  });
}

// Отправка уведомления о достижении цели
export function sendGoalAchievedNotification(goalName: string): void {
  sendNotification({
    title: 'Цель достигнута!',
    body: `Поздравляем! Вы накопили на "${goalName}"`,
    tag: 'goal-achieved',
    requireInteraction: true,
  });
}

// Отправка уведомления о перерасходе бюджета (100%+)
export function sendBudgetOverrunNotification(
  categoryName: string,
  spent: number,
  limit: number
): void {
  sendNotification({
    title: 'Перерасход бюджета',
    body: `По категории "${categoryName}" потрачено ${spent.toLocaleString('ru-RU')} ₽ из ${limit.toLocaleString('ru-RU')} ₽`,
    tag: 'budget-overrun',
    requireInteraction: true,
  });
}

// Отправка уведомления о приближении к лимиту бюджета (80-100%)
export function sendBudgetWarningNotification(
  categoryName: string,
  spent: number,
  limit: number,
  percent: number
): void {
  sendNotification({
    title: 'Бюджет почти исчерпан',
    body: `По категории "${categoryName}" использовано ${percent}% — ${(limit - spent).toLocaleString('ru-RU')} ₽ осталось`,
    tag: 'budget-warning',
  });
}

// Отправка напоминания о цели
export function sendGoalReminderNotification(
  goalName: string,
  monthlyAmount: number
): void {
  sendNotification({
    title: 'Напоминание о цели',
    body: `Для цели "${goalName}" нужно откладывать ${monthlyAmount.toLocaleString('ru-RU')} ₽/мес`,
    tag: 'goal-reminder',
  });
}

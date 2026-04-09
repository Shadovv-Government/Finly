import React, { useMemo } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { iconMap } from '../hooks/useNotificationPanel';
import type { PanelNotification } from '../hooks/useNotificationPanel';
import { useNavigate } from 'react-router-dom';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: PanelNotification[];
  hasUnread: boolean;
  markAllRead: () => Promise<void>;
  clearRead: () => Promise<void>;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  hasUnread,
  markAllRead,
  clearRead,
}) => {
  const navigate = useNavigate();

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; items: typeof notifications }[] = [];
    const now = Date.now();
    const MS_PER_DAY = 86400000;

    for (const item of notifications) {
      const age = now - item.createdAt;
      let label: string;

      if (age < MS_PER_DAY) {
        label = 'Сегодня';
      } else if (age < MS_PER_DAY * 2) {
        label = 'Вчера';
      } else if (age < MS_PER_DAY * 7) {
        label = 'На этой неделе';
      } else {
        label = 'Ранее';
      }

      let group = groups.find(g => g.label === label);
      if (!group) {
        group = { label, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }

    return groups;
  }, [notifications]);

  const handleAction = (actionData?: string) => {
    if (actionData) {
      onClose();
      navigate(actionData);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Уведомления" side="top">
      <div className="px-4 py-3 pb-8">
        {/* Actions bar */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            {hasUnread && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Прочитать все
              </button>
            )}
            <button
              onClick={clearRead}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Очистить прочитанные
            </button>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Bell className="w-12 h-12 opacity-30" />
            <p className="text-sm">Всё в порядке, уведомлений нет</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedNotifications.map(group => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                  {group.label}
                </p>
                <ul className="flex flex-col gap-2">
                  {group.items.map((item, idx) => (
                    <li
                      key={item.id ?? `dynamic-${item.type}-${idx}`}
                      className={`flex items-start gap-3 p-3 rounded-2xl transition-colors ${
                        item.read ? 'bg-muted/30 opacity-70' : 'bg-muted/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.iconBg}`}>
                        {iconMap[item.icon] || <Bell className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.subtitle}
                        </p>
                        {item.actionLabel && !item.read && (
                          <button
                            onClick={() => handleAction(item.actionData)}
                            className="text-xs font-medium text-violet-600 dark:text-violet-400 mt-1.5 hover:underline"
                          >
                            {item.actionLabel} →
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};

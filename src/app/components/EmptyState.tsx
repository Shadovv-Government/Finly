import { ReactNode } from 'react';
import { getLucideIcon } from '../utils/lucideIcons';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({ icon, title, description, action, children }: EmptyStateProps) {
  const Icon = getLucideIcon(icon);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
      <div className="w-[120px] h-[120px] rounded-full bg-muted flex items-center justify-center mb-6 shadow-sm">
        <Icon className="w-14 h-14 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold tracking-[-0.01em] mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] mb-6 leading-relaxed">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary"
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}

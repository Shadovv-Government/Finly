import { ReactNode } from 'react';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({ emoji, title, description, action, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
      <div className="w-[120px] h-[120px] rounded-full bg-muted flex items-center justify-center text-5xl mb-6 shadow-sm">
        {emoji}
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

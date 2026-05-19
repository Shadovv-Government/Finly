interface AmountDisplayProps {
  amount: number;
  type?: 'income' | 'expense' | 'neutral';
  showSign?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AmountDisplay: React.FC<AmountDisplayProps> = ({ 
  amount, 
  type = 'neutral',
  showSign = true,
  size = 'md'
}) => {
  const colorClasses = {
    income: 'text-green-600 dark:text-green-500',
    expense: 'text-red-600 dark:text-red-500',
    neutral: 'text-foreground'
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl'
  };

  const sign = type === 'income' ? '+' : type === 'expense' ? '−' : '';
  
  return (
    <span className={`${colorClasses[type]} ${sizeClasses[size]} font-semibold text-numeric tracking-[-0.01em]`}>
      {showSign && sign} {amount.toLocaleString('ru-RU')} ₽
    </span>
  );
};

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { BottomSheet } from './BottomSheet';
import { getCurrentBalance } from '../../db/analytics';

interface ContributeBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  currentAmount: number;
  targetAmount: number;
  userBalance?: number;
}

export const ContributeBottomSheet: React.FC<ContributeBottomSheetProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentAmount,
  targetAmount,
  userBalance,
}) => {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balance, setBalance] = useState<number>(userBalance ?? 0);

  // Загружаем баланс при открытии
  useEffect(() => {
    if (isOpen) {
      getCurrentBalance().then(setBalance);
    }
  }, [isOpen]);

  const effectiveBalance = userBalance ?? balance;

  const formatAmount = (value: string) => {
    if (!value) return '';
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
  };

  const parseAmount = (value: string) => value.replace(/\s/g, '');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsed = parseAmount(value);
    if (/^\d*\.?\d*$/.test(parsed)) {
      setAmount(parsed);
    }
  };

  const remaining = targetAmount - currentAmount;

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || numAmount <= 0) {
      toast.error('Введите сумму больше 0');
      return;
    }

    if (numAmount > effectiveBalance) {
      toast.error(`Недостаточно средств. Доступно: ${effectiveBalance.toLocaleString('ru-RU')} ₽`);
      return;
    }

    if (numAmount > remaining) {
      toast.warning(`Сумма больше необходимой. Осталось: ${remaining.toLocaleString('ru-RU')} ₽`);
    }

    setIsSubmitting(true);
    try {
      await onSubmit(numAmount);
      toast.success('Цель пополнена!');
      setAmount('');
      onClose();
    } catch (error) {
      toast.error('Ошибка при пополнении цели');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [1000, 5000, 10000, remaining > 0 ? remaining : 0].filter((a, i, arr) => a > 0 && arr.indexOf(a) === i);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Пополнить цель"
    >
      <div className="flex flex-col pb-4">
        {/* Информация о цели */}
        <div className="px-4 py-4 bg-muted m-4 rounded-xl">
          <div className="text-sm text-muted-foreground mb-1">Уже накоплено</div>
          <div className="text-2xl font-bold">{currentAmount.toLocaleString('ru-RU')} ₽</div>
          <div className="text-sm text-muted-foreground mt-2">
            Осталось: <span className="font-semibold">{remaining.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        {/* Баланс пользователя */}
        <div className="px-4 py-3 m-4 rounded-xl border border-border">
          <div className="text-sm text-muted-foreground mb-1">Доступно для пополнения</div>
          <div className="text-xl font-bold">{effectiveBalance.toLocaleString('ru-RU')} ₽</div>
        </div>

        {/* Ввод суммы */}
        <div className="px-4 py-6">
          <input
            type="tel"
            inputMode="decimal"
            placeholder="0"
            value={formatAmount(amount)}
            onChange={handleAmountChange}
            className="w-full text-4xl font-bold text-center bg-transparent outline-none"
            autoFocus
          />
          <p className="text-center text-muted-foreground mt-2">₽</p>
        </div>

        {/* Быстрые суммы */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => setAmount(quickAmount.toString())}
                className="py-3 bg-muted rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                {quickAmount >= 1000 ? `${quickAmount / 1000}к` : quickAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Кнопка пополнения */}
        <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Пополнение...' : 'Пополнить'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

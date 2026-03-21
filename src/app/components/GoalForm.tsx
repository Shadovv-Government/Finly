import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Goal } from '../../db/types';
import { BottomSheet } from './BottomSheet';
import { useNotifications } from '../hooks/useNotifications';

interface GoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: Omit<Goal, 'id'>) => Promise<void>;
  initialData?: Goal;
}

const PRESET_COLORS = [
  '#FF5722', // red
  '#2196F3', // blue
  '#4CAF50', // green
  '#E91E63', // pink
  '#9C27B0', // purple
  '#FF9800', // orange
  '#00BCD4', // cyan
  '#795548', // brown
];

export const GoalForm: React.FC<GoalFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { notify } = useNotifications();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Заполнить форму данными при редактировании
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTargetAmount(initialData.targetAmount.toString());
      setCurrentAmount(initialData.currentAmount.toString());
      setDeadline(initialData.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '');
      setSelectedColor(initialData.color);
      setIsActive(initialData.isActive);
    } else {
      // Сброс для новой цели
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setDeadline('');
      setSelectedColor(PRESET_COLORS[0]);
      setIsActive(true);
    }
  }, [initialData, isOpen]);

  const formatAmount = (value: string) => {
    if (!value) return '';
    const parts = value.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
  };

  const parseAmount = (value: string) => value.replace(/\s/g, '');

  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const value = e.target.value;
    const parsed = parseAmount(value);
    if (/^\d*\.?\d*$/.test(parsed)) {
      setter(parsed);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Введите название цели');
      return;
    }

    const target = parseFloat(targetAmount);
    if (!targetAmount || target <= 0) {
      toast.error('Введите целевую сумму больше 0');
      return;
    }

    const current = parseFloat(currentAmount) || 0;
    if (current > target) {
      toast.error('Текущая сумма не может быть больше целевой');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        deadline: deadline ? new Date(deadline).getTime() : undefined,
        icon: 'Target',
        color: selectedColor,
        isActive,
      });
      
      // Отправляем push-уведомление
      notify('Цель создана', initialData ? 'Цель обновлена' : `Цель "${name.trim()}" создана`, '/pwa-192x192.svg');
      
      toast.success(initialData ? 'Цель обновлена' : 'Цель создана');
      onClose();
    } catch (error) {
      toast.error('Ошибка при сохранении цели');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Редактировать цель' : 'Новая цель'}
    >
      <div className="flex flex-col pb-4">
        {/* Название цели */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-2 block">Название</label>
          <input
            type="text"
            placeholder="Например: Новый автомобиль"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-violet-600"
          />
        </div>

        {/* Целевая сумма */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-2 block">Целевая сумма</label>
          <input
            type="tel"
            inputMode="decimal"
            placeholder="0"
            value={formatAmount(targetAmount)}
            onChange={(e) => handleAmountChange(e, setTargetAmount)}
            className="w-full text-3xl font-bold text-center bg-transparent outline-none"
          />
          <p className="text-center text-muted-foreground mt-2">₽</p>
        </div>

        {/* Текущая сумма */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-2 block">Уже накоплено</label>
          <input
            type="tel"
            inputMode="decimal"
            placeholder="0"
            value={formatAmount(currentAmount)}
            onChange={(e) => handleAmountChange(e, setCurrentAmount)}
            className="w-full px-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-violet-600"
          />
        </div>

        {/* Дедлайн */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-2 block">Срок (необязательно)</label>
          <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="flex-1 bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Выбор цвета */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Цвет</label>
          <div className="flex flex-wrap gap-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-10 h-10 rounded-full transition-transform ${
                  selectedColor === color ? 'ring-2 ring-offset-2 ring-violet-600 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Активность */}
        <div className="px-4 py-4">
          <label className="flex items-center justify-between p-4 bg-muted rounded-xl cursor-pointer">
            <span className="text-sm font-medium">Активная цель</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 accent-violet-600"
            />
          </label>
        </div>

        {/* Кнопка сохранения */}
        <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Сохранение...' : initialData ? 'Сохранить изменения' : 'Создать цель'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

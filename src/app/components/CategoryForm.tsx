import { useState, useEffect } from 'react';
import { Category } from '../../db/types';
import { BottomSheet } from './BottomSheet';
import { useNotifications } from '../hooks/useNotifications';
import { ShoppingCart } from 'lucide-react';
import { getLucideIcon } from '../utils/lucideIcons';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: Omit<Category, 'id' | 'isSystem'>) => Promise<void>;
  initialData?: Category;
  type?: 'income' | 'expense';
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
  '#03A9F4', // light blue
  '#8BC34A', // light green
  '#FFC107', // amber
  '#3F51B5', // indigo
];

const ICON_LIST = [
  'ShoppingCart',
  'Car',
  'Coffee',
  'Gamepad2',
  'Heart',
  'Shirt',
  'Home',
  'GraduationCap',
  'Wallet',
  'Briefcase',
  'Gift',
  'TrendingUp',
  'Plane',
  'Music',
  'Film',
  'Dumbbell',
  'Book',
  'Smartphone',
  'Monitor',
  'Utensils',
  'Bus',
  'Zap',
  'Cloud',
  'Star',
  'Award',
  'Target',
  'Camera',
  'Headphones',
  'Banknote',
  'Coins',
];

export const CategoryForm: React.FC<CategoryFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  type: initialType,
}) => {
  const { notify } = useNotifications();
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
  const [selectedIcon, setSelectedIcon] = useState('ShoppingCart');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Заполнить форму данными при редактировании
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSelectedType(initialData.type);
      setSelectedIcon(initialData.icon);
      setSelectedColor(initialData.color);
    } else {
      // Сброс для новой категории
      setName('');
      setSelectedType(initialType || 'expense');
      setSelectedIcon('ShoppingCart');
      setSelectedColor(PRESET_COLORS[0]);
    }
  }, [initialData, isOpen, initialType]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      notify('Введите название категории', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        type: selectedType,
        icon: selectedIcon,
        color: selectedColor,
      });

      notify(
        initialData ? 'Категория обновлена' : 'Категория создана',
        initialData ? `Категория "${name.trim()}" обновлена` : `Категория "${name.trim()}" создана`
      );

      onClose();
    } catch (error) {
      notify('Ошибка при сохранении', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const IconPreview = () => {
    const IconComponent = getLucideIcon(selectedIcon, ShoppingCart);
    return (
      <IconComponent className="w-8 h-8" style={{ color: selectedColor }} />
    );
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Редактировать категорию' : 'Новая категория'}
    >
      <div className="flex flex-col pb-4">
        {/* Предпросмотр */}
        <div className="px-4 py-4 flex justify-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: selectedColor + '20' }}
          >
            <IconPreview />
          </div>
        </div>

        {/* Название категории */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-2 block">Название</label>
          <input
            type="text"
            placeholder="Например: Продукты"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-primary"
            maxLength={30}
          />
        </div>

        {/* Тип категории (только для новых) */}
        {!initialData && (
          <div className="px-4 py-4">
            <label className="text-sm font-medium mb-3 block">Тип</label>
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <button
                onClick={() => setSelectedType('expense')}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  selectedType === 'expense'
                    ? 'bg-red-600 text-white'
                    : 'text-muted-foreground'
                }`}
              >
                Расход
              </button>
              <button
                onClick={() => setSelectedType('income')}
                className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                  selectedType === 'income'
                    ? 'bg-green-600 text-white'
                    : 'text-muted-foreground'
                }`}
              >
                Доход
              </button>
            </div>
          </div>
        )}

        {/* Выбор иконки */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Иконка</label>
          <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 bg-muted rounded-xl">
            {ICON_LIST.map((iconName) => {
              const IconComponent = getLucideIcon(iconName, ShoppingCart);
              return (
                <button
                  key={iconName}
                  onClick={() => setSelectedIcon(iconName)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    selectedIcon === iconName
                      ? 'bg-primary/10 dark:bg-primary/15 ring-2 ring-primary'
                      : 'hover:bg-muted-foreground/10'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Выбор цвета */}
        <div className="px-4 py-4">
          <label className="text-sm font-medium mb-3 block">Цвет</label>
          <div className="grid grid-cols-8 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-10 h-10 rounded-full transition-transform ${
                  selectedColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Кнопка сохранения */}
        <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)]">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 text-white rounded-xl font-semibold disabled:opacity-50 shadow-lg transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
          >
            {isSubmitting ? 'Сохранение...' : initialData ? 'Сохранить изменения' : 'Создать категорию'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

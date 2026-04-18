import { useCategories } from '../hooks/useCategories';
import { CircleHelp, Wallet } from 'lucide-react';
import { getLucideIcon } from '../utils/lucideIcons';

interface CategoryBadgeProps {
  categoryId?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  categoryId,
  size = 'md',
  showName = false
}) => {
  const { categories } = useCategories();
  const category = categories.find(c => c.id === categoryId);

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const containerSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  if (!category) {
    return (
      <div className={`${containerSizes[size]} rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800`}>
        <CircleHelp className={`${iconSizes[size]} text-gray-400`} />
      </div>
    );
  }

  const IconComponent = getLucideIcon(category.icon, Wallet);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${containerSizes[size]} rounded-xl flex items-center justify-center`}
        style={{ backgroundColor: category.color + '20' }}
      >
        <IconComponent
          className={iconSizes[size]}
          style={{ color: category.color }}
        />
      </div>
      {showName && <span className="font-medium">{category.name}</span>}
    </div>
  );
};

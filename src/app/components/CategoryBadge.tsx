import * as Icons from 'lucide-react';
import { useCategories } from '../hooks/useCategories';

interface CategoryBadgeProps {
  categoryId: string;
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
  
  if (!category) {
    // Default fallback icon
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12'
    };
    return (
      <div className={`${sizeClasses[size]} rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800`}>
        <Icons.HelpCircle className="w-5 h-5 text-gray-400" />
      </div>
    );
  }

  const IconComponent = Icons[category.icon as keyof typeof Icons] as React.ElementType || Icons.HelpCircle;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-xl flex items-center justify-center`}
        style={{ backgroundColor: category.color + '20' }}
      >
        <IconComponent
          className={`${sizeClasses[size]} text-${size === 'sm' ? '4' : size === 'md' ? '5' : '6'}`}
          style={{ color: category.color }}
        />
      </div>
      {showName && <span className="font-medium">{category.name}</span>}
    </div>
  );
};

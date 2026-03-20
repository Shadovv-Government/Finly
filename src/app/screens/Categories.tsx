import { Plus, Edit2, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useState } from 'react';

export const Categories = () => {
  const { categories } = useCategories();
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Категории</h1>
          <button 
            onClick={() => setEditMode(!editMode)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              editMode 
                ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400' 
                : 'bg-violet-600 text-white'
            }`}
          >
            {editMode ? 'Готово' : 'Изменить'}
          </button>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="px-4 py-4">
        <h2 className="font-bold mb-3 text-red-600 dark:text-red-400">Расходы</h2>
        <div className="grid grid-cols-3 gap-3">
          {categories
            .filter(c => c.type === 'expense')
            .map(category => {
              const IconComponent = Icons[category.icon as keyof typeof Icons] as React.ElementType;
              return (
                <div
                  key={category.id}
                  className="relative bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2"
                >
                  {editMode && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button className="w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                        <Edit2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button className="w-6 h-6 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
                        <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  )}
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <IconComponent 
                      className="w-7 h-7" 
                      style={{ color: category.color }}
                    />
                  </div>
                  <span className="text-sm text-center font-medium leading-tight">
                    {category.name}
                  </span>
                </div>
              );
            })}
          
          {/* Add Category Card */}
          <button className="bg-card border-2 border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Plus className="w-7 h-7 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              Добавить
            </span>
          </button>
        </div>
      </div>

      {/* Income Categories */}
      <div className="px-4 py-4">
        <h2 className="font-bold mb-3 text-green-600 dark:text-green-400">Доходы</h2>
        <div className="grid grid-cols-3 gap-3">
          {categories
            .filter(c => c.type === 'income')
            .map(category => {
              const IconComponent = Icons[category.icon as keyof typeof Icons] as React.ElementType;
              return (
                <div
                  key={category.id}
                  className="relative bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2"
                >
                  {editMode && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button className="w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                        <Edit2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button className="w-6 h-6 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
                        <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  )}
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <IconComponent 
                      className="w-7 h-7" 
                      style={{ color: category.color }}
                    />
                  </div>
                  <span className="text-sm text-center font-medium leading-tight">
                    {category.name}
                  </span>
                </div>
              );
            })}
          
          {/* Add Category Card */}
          <button className="bg-card border-2 border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Plus className="w-7 h-7 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              Добавить
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

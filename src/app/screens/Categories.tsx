import { Plus, Edit2, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useState } from 'react';
import { Category } from '../../db/types';
import { CategoryForm } from '../components/CategoryForm';
import { useNotifications } from '../hooks/useNotifications';

export const Categories = () => {
  const { categories, add, update, remove } = useCategories();
  const { notify } = useNotifications();
  const [editMode, setEditMode] = useState(false);
  
  // Состояние для формы категории
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  
  // Состояние для диалога подтверждения удаления
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Открыть форму для новой категории
  const handleAddCategory = (type: 'income' | 'expense') => {
    setFormType(type);
    setEditingCategory(undefined);
    setIsFormOpen(true);
  };

  // Открыть форму для редактирования
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  // Открыть диалог удаления
  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category);
  };

  // Подтвердить удаление
  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    
    try {
      await remove(deletingCategory.id);
      notify('✅ Категория удалена', `Категория "${deletingCategory.name}" удалена`);
    } catch (error: any) {
      notify('❌ Ошибка', error?.message || 'Не удалось удалить категорию');
    } finally {
      setDeletingCategory(null);
    }
  };

  // Обработка отправки формы
  const handleSubmit = async (categoryData: Omit<Category, 'id' | 'isSystem'>) => {
    if (editingCategory) {
      // Редактирование
      await update(editingCategory.id, categoryData);
    } else {
      // Создание новой
      await add(categoryData);
    }
  };

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
              const IconComponent = (Icons[category.icon as keyof typeof Icons] as React.ElementType) || Icons.Wallet;
              return (
                <div
                  key={category.id}
                  className="relative bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2"
                >
                  {editMode && !category.isSystem && (
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <button 
                        onClick={() => handleEditCategory(category)}
                        className="w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(category)}
                        className="w-6 h-6 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                      >
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
                  {category.isSystem && (
                    <span className="text-xs text-muted-foreground mt-1">Системная</span>
                  )}
                </div>
              );
            })}

          {/* Add Category Card */}
          <button 
            onClick={() => handleAddCategory('expense')}
            className="bg-card border-2 border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors"
          >
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
              const IconComponent = (Icons[category.icon as keyof typeof Icons] as React.ElementType) || Icons.Wallet;
              return (
                <div
                  key={category.id}
                  className="relative bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2"
                >
                  {editMode && !category.isSystem && (
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <button 
                        onClick={() => handleEditCategory(category)}
                        className="w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(category)}
                        className="w-6 h-6 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                      >
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
                  {category.isSystem && (
                    <span className="text-xs text-muted-foreground mt-1">Системная</span>
                  )}
                </div>
              );
            })}

          {/* Add Category Card */}
          <button 
            onClick={() => handleAddCategory('income')}
            className="bg-card border-2 border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Plus className="w-7 h-7 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              Добавить
            </span>
          </button>
        </div>
      </div>

      {/* Форма добавления/редактирования категории */}
      <CategoryForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCategory(undefined);
        }}
        onSubmit={handleSubmit}
        initialData={editingCategory}
        type={formType}
      />

      {/* Диалог подтверждения удаления */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Удалить категорию?</h3>
            <p className="text-muted-foreground mb-6">
              Вы уверены, что хотите удалить категорию "{deletingCategory.name}"? 
              Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingCategory(null)}
                className="flex-1 py-3 bg-muted rounded-xl font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

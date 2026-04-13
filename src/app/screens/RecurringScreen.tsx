import { useState } from 'react';
import { Plus, Pencil, Trash2, Clock, CalendarDays, ArrowDownCircle, ArrowUpCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { RecurringTemplate } from '../../db/types';
import { RecurringTemplateForm } from '../components/RecurringTemplateForm';
import { useRecurringTemplates } from '../hooks/useRecurringTemplates';
import { useCategories } from '../hooks/useCategories';
import { formatAmountInput } from '../utils/formatCurrency';

const INTERVAL_LABELS: Record<string, string> = {
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
};

export const Recurring = () => {
  const { templates, add, update, remove, toggleActive } = useRecurringTemplates();
  const { categories } = useCategories();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | undefined>(undefined);

  const handleAdd = () => {
    setEditingTemplate(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (template: RecurringTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const handleSubmit = async (templateData: Omit<RecurringTemplate, 'id'>) => {
    if (editingTemplate?.id) {
      await update(editingTemplate.id, templateData);
    } else {
      await add(templateData);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Удалить этот шаблон?')) {
      await remove(id);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    await toggleActive(id, !isActive);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Повторяющиеся</h1>
          <button
            onClick={handleAdd}
            className="w-9 h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Templates List */}
      <div className="px-4 py-4 space-y-3">
        {templates.map(template => {
          const category = categories.find(c => c.id === template.categoryId);

          return (
            <div
              key={template.id}
              className={`bg-card rounded-2xl p-4 border border-border transition-opacity ${
                !template.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: category?.color + '20' || '#e0e0e0' }}
                >
                  {template.type === 'income' ? (
                    <ArrowUpCircle className="w-6 h-6" style={{ color: category?.color || '#4CAF50' }} />
                  ) : (
                    <ArrowDownCircle className="w-6 h-6" style={{ color: category?.color || '#FF5722' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-lg">
                        {formatAmountInput(template.amount.toString())} ₽
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {category?.name || 'Без категории'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(template.id!, template.isActive)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                        title={template.isActive ? 'Отключить' : 'Включить'}
                      >
                        {template.isActive ? (
                          <ToggleRight className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(template)}
                        className="w-8 h-8 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id!)}
                        className="w-8 h-8 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{INTERVAL_LABELS[template.interval]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>С {formatDate(template.nextDate)}</span>
                    </div>
                  </div>

                  {template.comment && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {template.comment}
                    </p>
                  )}

                  {!template.isActive && (
                    <span className="inline-block mt-2 text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                      Отключён
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="px-4 py-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">Нет повторяющихся платежей</p>
          <button
            onClick={handleAdd}
            className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
          >
            Создать первый шаблон
          </button>
        </div>
      )}

      {/* Add Button (when templates exist) */}
      {templates.length > 0 && (
        <div className="px-4 py-4">
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="w-5 h-5" />
            Добавить шаблон
          </button>
        </div>
      )}

      {/* Stats Card */}
      {templates.length > 0 && (() => {
        const activeTemplates = templates.filter(t => t.isActive);
        const monthlyTotal = activeTemplates.reduce((sum, t) => {
          let monthly = t.amount;
          switch (t.interval) {
            case 'daily': monthly *= 30; break;
            case 'weekly': monthly *= 4.33; break;
            case 'yearly': monthly /= 12; break;
          }
          return sum + (t.type === 'expense' ? monthly : 0);
        }, 0);

        return (
          <div className="px-4 pb-4">
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-2xl p-4 border border-violet-200 dark:border-violet-800">
              <h3 className="font-bold text-violet-900 dark:text-violet-100 mb-2 flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Сводка
              </h3>
              <div className="space-y-1">
                <p className="text-sm text-violet-800 dark:text-violet-200">
                  Активных шаблонов: <span className="font-semibold">{activeTemplates.length} из {templates.length}</span>
                </p>
                <p className="text-sm text-violet-800 dark:text-violet-200">
                  Расходы в месяц: <span className="font-semibold">{Math.round(monthlyTotal).toLocaleString('ru-RU')} ₽</span>
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Form */}
      <RecurringTemplateForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTemplate(undefined);
        }}
        onSubmit={handleSubmit}
        initialData={editingTemplate}
      />
    </div>
  );
};

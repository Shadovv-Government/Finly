import { useState } from 'react';
import { Plus, Pencil, Trash2, Clock, CalendarDays, ArrowDownCircle, ArrowUpCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion } from 'motion/react';
import { sectionVariants, cardVariants } from '../utils/animations';
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
  const { templates, add, update, remove, toggleActive, loading } = useRecurringTemplates();
  const { categories } = useCategories();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | undefined>(undefined);
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);

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

  const handleDelete = (id: number) => {
    setDeletingTemplateId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deletingTemplateId === null) return;
    await remove(deletingTemplateId);
    setDeletingTemplateId(null);
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
    <div className="pb-28 bg-background min-h-screen">
      {/* Header */}
      <motion.section custom={0} variants={sectionVariants} initial="hidden" animate="visible">
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold tracking-[-0.01em]">Регулярные платежи</h1>
          <button
            onClick={handleAdd}
            className="w-9 h-9 bg-primary hover:bg-primary/90 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      </motion.section>

      {/* Skeleton while loading */}
      {loading && (
        <div className="px-5 py-4 space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="card-premium p-5 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-24" />
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-48 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates List */}
      {!loading && <div className="px-5 py-4 space-y-3">
        {templates.map((template, index) => {
          const category = categories.find(c => c.id === template.categoryId);
          const daysUntil = Math.ceil((template.nextDate - Date.now()) / (24 * 60 * 60 * 1000));
          const daysLabel = daysUntil <= 0 ? 'Сегодня!' : daysUntil === 1 ? 'Завтра' : `Через ${daysUntil} дн.`;
          const isUrgent = daysUntil <= 1;

          return (
            <motion.div
              key={template.id}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className={`card-premium p-5 transition-opacity ${
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
                          <ToggleRight className="w-6 h-6 text-primary" />
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
                  <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{INTERVAL_LABELS[template.interval]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{formatDate(template.nextDate)}</span>
                    </div>
                    {template.isActive && (
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        isUrgent
                          ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {daysLabel}
                      </span>
                    )}
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
            </motion.div>
          );
        })}
      </div>}

      {/* Empty State */}
      {!loading && templates.length === 0 && (
        <motion.section custom={0} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="px-5 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center shadow-sm">
            <Clock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold mb-2">Нет повторяющихся платежей</h2>
          <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
            Добавьте шаблон для автоматического учёта регулярных доходов и расходов
          </p>
          <button
            onClick={handleAdd}
            className="px-6 py-3 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
          >
            Создать первый шаблон
          </button>
        </div>
        </motion.section>
      )}

      {/* Add Button (when templates exist) */}
      {!loading && templates.length > 0 && (
        <motion.section custom={templates.length} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="px-5 py-4">
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="w-5 h-5" />
            Добавить шаблон
          </button>
        </div>
        </motion.section>
      )}

      {/* Stats Card */}
      {!loading && templates.length > 0 && (() => {
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
          <motion.section custom={templates.length + 1} variants={sectionVariants} initial="hidden" animate="visible">
          <div className="px-5 pb-4">
            <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-5 border border-primary/15 dark:border-primary/20">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Сводка
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Активных шаблонов: <span className="font-semibold text-foreground">{activeTemplates.length} из {templates.length}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Расходы в месяц: <span className="font-semibold text-foreground">{Math.round(monthlyTotal).toLocaleString('ru-RU')} ₽</span>
                </p>
              </div>
            </div>
          </div>
          </motion.section>
        );
      })()}

      {deletingTemplateId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-lg border border-border">
            <h3 className="text-lg font-bold mb-2">Удалить шаблон?</h3>
            <p className="text-muted-foreground mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingTemplateId(null)}
                className="flex-1 py-3 bg-muted hover:bg-muted-foreground/10 rounded-xl font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

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

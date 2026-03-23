import { useState } from 'react';
import { Plus, Target, TrendingUp, Pencil, Trash2, PiggyBank, PartyPopper, Trophy } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useGoals } from '../hooks/useGoals';
import { GoalForm } from '../components/GoalForm';
import { ContributeBottomSheet } from '../components/ContributeBottomSheet';
import { Goal } from '../../db/types';

export const Goals = () => {
  const { goals, createGoal, editGoal, removeGoal, addContribution, fetchBalance } = useGoals();

  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);

  const handleCreateGoal = async (goal: Omit<Goal, 'id'>) => {
    await createGoal(goal);
    setIsCreateFormOpen(false);
  };

  const handleEditGoal = async (goal: Omit<Goal, 'id'>) => {
    if (selectedGoal) {
      await editGoal(selectedGoal.id!, goal);
      setSelectedGoal(null);
      setIsEditFormOpen(false);
    }
  };

  const handleContribute = async (amount: number) => {
    if (selectedGoal) {
      await addContribution(selectedGoal.id!, amount);
      const newBalance = await fetchBalance();
      setUserBalance(newBalance);
      setSelectedGoal(null);
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    if (window.confirm(`Вы уверены, что хотите удалить цель "${goal.name}"?`)) {
      removeGoal(goal.id!);
    }
  };

  const openEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsEditFormOpen(true);
  };

  const openContribute = async (goal: Goal) => {
    setSelectedGoal(goal);
    const balance = await fetchBalance();
    setUserBalance(balance);
    setIsContributeOpen(true);
  };

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <h1 className="text-xl font-bold">Цели и накопления</h1>
      </div>

      {/* Goals List */}
      <div className="px-4 py-4 space-y-4">
        {goals.length > 0 && goals.map(goal => {
          const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const remaining = goal.targetAmount - goal.currentAmount;
          const daysUntil = goal.deadline ? Math.ceil((goal.deadline - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
          const monthlyNeeded = daysUntil > 0 ? Math.ceil(remaining / (daysUntil / 30)) : 0;

          return (
            <div
              key={goal.id}
              className="bg-card rounded-2xl p-5 border border-border"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: goal.color + '20' }}
                  >
                    {(() => {
                      const IconComponent = (Icons[goal.icon as keyof typeof Icons] as React.ElementType) || Target;
                      return <IconComponent className="w-6 h-6" style={{ color: goal.color }} />;
                    })()}
                  </div>
                  <div>
                    <h3 className="font-bold">{goal.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {goal.deadline ? `до ${new Date(goal.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                    </p>
                  </div>
                </div>
                {!goal.isActive && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    Завершена
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-bold">
                      {goal.currentAmount.toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="text-sm text-muted-foreground">
                      из {goal.targetAmount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: goal.color
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {percentage.toFixed(0)}%
                  </div>
                </div>

                {daysUntil > 0 && remaining > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">
                      <span className="text-muted-foreground">Откладывай </span>
                      <span className="font-semibold">{monthlyNeeded.toLocaleString('ru-RU')} ₽/мес</span>
                      <span className="text-muted-foreground"> чтобы достичь цели</span>
                    </p>
                  </div>
                )}

                {percentage >= 100 && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
                    <PiggyBank className="w-4 h-4 text-green-600" />
                    <div className="flex items-center gap-2">
                      <PartyPopper className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-green-800 dark:text-green-200 font-semibold">
                        Цель достигнута!
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => openContribute(goal)}
                    disabled={!goal.isActive}
                    className="flex-[2] py-2 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Пополнить
                  </button>
                  <button
                    onClick={() => openEdit(goal)}
                    className="flex-1 py-2 bg-muted text-foreground rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal)}
                    className="flex-[1.5] py-2 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Target className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">У вас пока нет целей</p>
            <button
              onClick={() => setIsCreateFormOpen(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              Создать первую цель
            </button>
          </div>
        )}
      </div>

      {/* Add Goal Button */}
      {goals.length > 0 && (
        <div className="px-4 py-4">
          <button
            onClick={() => setIsCreateFormOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="w-5 h-5" />
            Создать новую цель
          </button>
        </div>
      )}

      {/* Stats Card */}
      {goals.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl p-4 border border-green-200 dark:border-green-800">
            <h3 className="font-bold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Ваш прогресс
            </h3>
            <div className="space-y-1">
              <p className="text-sm text-green-800 dark:text-green-200">
                Всего накоплено: <span className="font-semibold">{goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0).toLocaleString('ru-RU')} ₽</span>
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Средний прогресс: <span className="font-semibold">{goals.length > 0 ? (goals.reduce((sum, g) => sum + ((g.currentAmount || 0) / (g.targetAmount || 1) * 100), 0) / goals.length).toFixed(0) : 0}%</span>
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Достигнуто целей: <span className="font-semibold">{goals.filter(g => g.currentAmount >= g.targetAmount).length} из {goals.length}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Модальные окна */}
      <GoalForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
        onSubmit={handleCreateGoal}
      />

      <GoalForm
        isOpen={isEditFormOpen}
        onClose={() => {
          setIsEditFormOpen(false);
          setSelectedGoal(null);
        }}
        onSubmit={handleEditGoal}
        initialData={selectedGoal || undefined}
      />

      <ContributeBottomSheet
        isOpen={isContributeOpen}
        onClose={() => {
          setIsContributeOpen(false);
          setSelectedGoal(null);
        }}
        onSubmit={handleContribute}
        currentAmount={selectedGoal?.currentAmount || 0}
        targetAmount={selectedGoal?.targetAmount || 0}
        userBalance={userBalance}
      />
    </div>
  );
};

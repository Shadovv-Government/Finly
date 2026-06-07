import { useState, useEffect } from 'react';
import { Fingerprint, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { PremiumAvatarWrapper } from '../components/PremiumAvatarWrapper';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const MAX_FAILURES = 3;

export const LockScreen = () => {
  const { user, biometric } = useAuth();
  const { isPremium } = usePremium();
  const [error, setError] = useState('');
  const [failureCount, setFailureCount] = useState(0);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async () => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    setError('');
    try {
      await biometric.unlock();
    } catch (err: unknown) {
      const newCount = failureCount + 1;
      setFailureCount(newCount);
      const backoff = Math.min(5000 * Math.pow(2, newCount - 1), 120000);
      setCooldownUntil(Date.now() + backoff);
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Биометрия отменена или недоступна');
      } else if (err instanceof Error && (err.name === 'NotFoundError' || err.name === 'InvalidStateError')) {
        // Credential удалён с устройства — автоматически отключаем
        await biometric.disable();
      } else {
        setError('Не удалось войти. Попробуйте снова.');
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  const handleForceDisable = () => {
    if (Date.now() < cooldownUntil) return;
    setShowDisableDialog(true);
  };

  const handleForceDisableConfirm = async () => {
    await biometric.disable();
  };

  // Автоматически показываем биометрию при монтировании
  useEffect(() => {
    handleUnlock();
  }, []);

  const getInitial = (name: string) => name.charAt(0).toUpperCase();
  const hasPhoto = !!user?.avatarDataUrl;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-5">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        {/* Контентная карточка */}
        <div className="card-featured w-full flex flex-col items-center gap-6 p-8">
          {/* Аватар */}
          <PremiumAvatarWrapper isPremium={isPremium}>
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md overflow-hidden ${
                !hasPhoto ? `bg-gradient-to-br ${user?.avatarColor || 'from-amber-400 to-pink-500'}` : ''
              }`}
            >
              {hasPhoto ? (
                <img src={user!.avatarDataUrl} alt="Аватар" className="w-full h-full object-cover" />
              ) : (
                user ? getInitial(user.name) : 'U'
              )}
            </div>
          </PremiumAvatarWrapper>

          {/* Имя */}
          <div className="text-center">
            <p className="text-xl font-semibold">{user?.name || 'Пользователь'}</p>
            <p className="text-sm text-muted-foreground mt-1">Приложение заблокировано</p>
          </div>

          {/* Иконка биометрии */}
          <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
            <Fingerprint className="w-10 h-10 text-primary dark:text-primary-light" />
          </div>

          {/* Ошибка */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Кнопка разблокировки */}
          <Button
            onClick={handleUnlock}
            disabled={isUnlocking}
            className="btn-primary w-full !py-3 !px-0 text-base"
          >
            {isUnlocking ? 'Проверка...' : 'Войти с биометрией'}
          </Button>

          {/* Аварийный выход после 3 неудач */}
          {failureCount >= MAX_FAILURES && (
            <button
              onClick={handleForceDisable}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Войти без биометрии (сбросить)
            </button>
          )}
        </div>
      </div>

      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отключить биометрию?</AlertDialogTitle>
            <AlertDialogDescription>
              Все финансовые данные станут доступны без подтверждения личности.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceDisableConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Отключить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

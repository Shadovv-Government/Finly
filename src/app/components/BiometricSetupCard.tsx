import { useState } from 'react';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';

interface BiometricSetupCardProps {
  onEnable: () => Promise<void>;
  onSkip: () => void;
}

export const BiometricSetupCard = ({ onEnable, onSkip }: BiometricSetupCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnable = async () => {
    setIsLoading(true);
    setError('');
    try {
      await onEnable();
    } catch {
      setError('Не удалось настроить биометрию. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 pt-4 border-t border-border">
      <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
        <Fingerprint className="w-7 h-7 text-violet-600 dark:text-violet-400" />
      </div>

      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-violet-600" />
          <p className="font-semibold">Защитите приложение</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Используйте Face ID или отпечаток пальца для быстрого входа
        </p>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      <div className="flex flex-col gap-2 w-full">
        <Button
          onClick={handleEnable}
          disabled={isLoading}
          className="w-full bg-violet-600 hover:bg-violet-700"
        >
          {isLoading ? 'Настройка...' : 'Включить'}
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className="w-full text-muted-foreground"
        >
          Пропустить
        </Button>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { BiometricSetupCard } from '../components/BiometricSetupCard';

type Step = 'register' | 'biometric';

export const Registration = () => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('register');
  const { register, biometric } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Введите имя');
      return;
    }

    if (name.trim().length < 2) {
      setError('Имя должно быть не менее 2 символов');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await register(name.trim());
      if (biometric.isSupported) {
        setStep('biometric');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Ошибка регистрации. Попробуйте снова.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    await biometric.enable();
    navigate('/');
  };

  const handleSkipBiometric = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        {/* Brand Mark */}
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-2xl flex items-center justify-center shadow-lg mb-8">
          <span className="text-white text-2xl font-bold" style={{ transform: 'rotate(-8deg)' }}>F</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-[-0.02em] mb-2">Finly</h1>
        <p className="text-muted-foreground text-center mb-8">
          Умное приложение для управления личными финансами
        </p>

        {step === 'register' ? (
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Как к вам обращаться?
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Введите ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="bg-input-background border border-border rounded-2xl p-4 text-base"
              />
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Загрузка...' : 'Начать'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Это создаст локальный аккаунт на этом устройстве
            </p>
          </form>
        ) : (
          <BiometricSetupCard
            onEnable={handleEnableBiometric}
            onSkip={handleSkipBiometric}
          />
        )}
      </div>
    </div>
  );
};

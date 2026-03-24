import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { BiometricSetupCard } from '../components/BiometricSetupCard';
import { Wallet } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Finly</CardTitle>
          <CardDescription>
            Умное приложение для управления личными финансами
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'register' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="text-base"
                />
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
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
        </CardContent>
      </Card>
    </div>
  );
};

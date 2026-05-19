import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/input';
import { BiometricSetupCard } from '../components/BiometricSetupCard';
import { Loader2, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, var(--primary), transparent 70%)' }} />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, var(--primary-light), transparent 70%)' }} />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 relative z-10">
        {step === 'register' ? (
          <div className="w-full max-w-sm">
            {/* Brand Mark */}
            <div className="flex justify-center mb-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}>
                <span className="text-white text-[28px] font-bold" style={{ transform: 'rotate(-8deg)' }}>F</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold tracking-[-0.02em] text-center mb-3">Finly</h1>
            <p className="text-muted-foreground text-center text-lg leading-relaxed mb-10">
              Умное приложение для управления личными финансами
            </p>

            {/* Form Card */}
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl p-6 shadow-lg space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-semibold">
                  Как к вам обращаться?
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Введите ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  className="bg-input-background border border-border rounded-2xl p-4 text-base focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/30 transition-all"
                />
                {error && (
                  <p className="text-sm text-red-500 font-medium">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 text-white rounded-2xl font-semibold text-base disabled:opacity-50 shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Загрузка...</>
                ) : (
                  <>Начать <ArrowRight className="w-5 h-5" /></>
                )}
              </button>

              <p className="text-xs text-center text-muted-foreground">
                Локальный аккаунт на этом устройстве
              </p>
            </form>
          </div>
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

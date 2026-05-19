import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Wallet, Sparkles, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Onboarding = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { completeOnboarding } = useAuth();

  const slides = [
    {
      icon: Wallet,
      title: 'Контролируй расходы',
      description: 'Отслеживай все доходы и расходы в одном месте. Простой и удобный интерфейс для управления финансами.',
      color: 'from-violet-600 to-indigo-700'
    },
    {
      icon: Sparkles,
      title: 'Умный ассистент',
      description: 'AI анализирует твои траты и дает персональные рекомендации для экономии и достижения финансовых целей.',
      color: 'from-pink-600 to-rose-700'
    },
    {
      icon: WifiOff,
      title: 'Работает офлайн',
      description: 'Все данные хранятся на устройстве. Пользуйся приложением в любое время, даже без интернета.',
      color: 'from-emerald-600 to-teal-700'
    }
  ];

  const finishOnboarding = async () => {
    localStorage.setItem('finly-onboarding-completed', 'true');
    await completeOnboarding();
    navigate('/');
  };

  const handleNext = async () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip Button */}
      <div className="px-4 py-4 flex justify-end">
        <button 
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Пропустить
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500" key={currentSlide}>
        {/* Brand Mark */}
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-2xl flex items-center justify-center shadow-lg mb-8">
          <span className="text-white text-2xl font-bold" style={{ transform: 'rotate(-8deg)' }}>F</span>
        </div>

        {/* Illustration */}
        <div
          className={`w-48 h-48 rounded-full bg-gradient-to-br ${slide.color} flex items-center justify-center mb-12 shadow-2xl`}
        >
          <Icon className="w-24 h-24 text-white" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-[-0.02em] text-center mb-4">
          {slide.title}
        </h1>

        {/* Description */}
        <p className="text-center text-muted-foreground text-lg leading-relaxed max-w-sm">
          {slide.description}
        </p>
      </div>

      {/* Bottom Section */}
      <div className="px-8 pb-8">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleNext}
          className="btn-primary w-full"
        >
          {currentSlide === slides.length - 1 ? 'Начать' : 'Далее'}
        </button>
      </div>
    </div>
  );
};

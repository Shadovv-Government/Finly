import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Wallet, Sparkles, WifiOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SLIDES = [
  {
    icon: Wallet,
    title: 'Контролируй расходы',
    description: 'Отслеживай все доходы и расходы в одном месте. Простой и удобный интерфейс для управления финансами.',
    gradient: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
    shadow: 'shadow-primary/25',
  },
  {
    icon: Sparkles,
    title: 'Умный ассистент',
    description: 'AI анализирует твои траты и даёт персональные рекомендации для экономии и достижения финансовых целей.',
    gradient: 'linear-gradient(225deg, var(--primary-light), #7c3aed)',
    shadow: 'shadow-primary/25',
  },
  {
    icon: WifiOff,
    title: 'Работает офлайн',
    description: 'Все данные хранятся на устройстве. Пользуйся приложением в любое время, даже без интернета.',
    gradient: 'linear-gradient(180deg, var(--primary), #059669)',
    shadow: 'shadow-emerald-500/25',
  },
];

export const Onboarding = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { completeOnboarding } = useAuth();

  const finishOnboarding = async () => {
    localStorage.setItem('finly-onboarding-completed', 'true');
    await completeOnboarding();
    navigate('/');
  };

  const handleNext = async () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04] transition-colors duration-700"
        style={{ background: `radial-gradient(circle, var(--primary), transparent 70%)` }} />

      {/* Skip Button */}
      <div className="px-4 py-4 flex justify-end relative z-10">
        <button
          onClick={handleSkip}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-1.5 rounded-full hover:bg-muted"
        >
          Пропустить
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-20 relative z-10" key={currentSlide}>
        {/* Brand Mark */}
        <div className="flex justify-center mb-10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md animate-in fade-in duration-500"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}>
            <span className="text-white text-xl font-bold" style={{ transform: 'rotate(-8deg)' }}>F</span>
          </div>
        </div>

        {/* Illustration — premium glass circle with gradient icon */}
        <div className="relative mb-12 animate-in zoom-in-95 fade-in duration-700">
          <div className="w-44 h-44 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              background: slide.gradient,
              boxShadow: `0 25px 50px -12px rgba(0,0,0,0.15)`,
            }}>
            <Icon className="w-20 h-20 text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-[-0.02em] text-center mb-4 animate-in slide-in-from-bottom-4 fade-in duration-500">
          {slide.title}
        </h1>

        {/* Description */}
        <p className="text-center text-muted-foreground text-lg leading-relaxed max-w-xs animate-in slide-in-from-bottom-6 fade-in duration-500">
          {slide.description}
        </p>
      </div>

      {/* Bottom Section */}
      <div className="px-8 pb-8 relative z-10">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2.5 mb-8">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-500 ${
                index === currentSlide
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted hover:bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleNext}
          className="w-full py-4 text-white rounded-2xl font-semibold text-base shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
        >
          {isLast ? 'Начать' : 'Далее'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

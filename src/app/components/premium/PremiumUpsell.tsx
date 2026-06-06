import { Crown } from 'lucide-react';

const FEATURES = [
  '🔮 ML-Прогнозы расходов на 30 дней',
  '📊 Сравнение год-к-году',
  '💚 Financial Health Score',
  '🤖 AI-Отчёты и инсайты',
  '📅 Календарный heatmap трат',
  '🔄 What-If симулятор',
  '📈 Декомпозиция трендов',
  '⚠️ Детектор финансовых проблем',
  '💰 Прогноз баланса на 3 месяца',
  '💡 План улучшения финансов',
  '🗣️ Спроси AI о своих финансах',
];

export const PremiumUpsell = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🔮</div>
        <h1 className="text-2xl font-bold mb-2">Premium Аналитика</h1>
        <p className="text-muted-foreground mb-2">
          Разблокируйте 11 мощных функций аналитики
        </p>
        <div className="flex items-center justify-center gap-1 mb-6">
          <Crown className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-600">
            Единоразовая покупка — навсегда
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 text-left mb-8">
          {FEATURES.map((f, i) => (
            <div key={i} className="text-sm flex items-center gap-2 p-2 bg-muted rounded-lg">
              <span>{f}</span>
            </div>
          ))}
        </div>

        <button className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-amber-600 transition-colors active:scale-[0.98]">
          Купить Premium
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Без подписок. Все будущие обновления включены.
        </p>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { db } from '../../../db/db';

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
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await db.settings.put({ key: 'premium', value: true });
      setActivated(true);
      // Перезагружаем страницу, чтобы PremiumGate увидел флаг
      window.location.reload();
    } catch {
      setActivating(false);
    }
  };

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

        <button
          onClick={handleActivate}
          disabled={activating || activated}
          className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-amber-600 transition-colors active:scale-[0.98] disabled:opacity-60"
        >
          {activating ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Активируем...
            </span>
          ) : activated ? (
            '✅ Активировано!'
          ) : (
            'Купить Premium'
          )}
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          {activated ? 'Перезагружаем...' : 'Тестовый режим: нажмите для мгновенной активации'}
        </p>
      </div>
    </div>
  );
};

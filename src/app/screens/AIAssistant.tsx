import { Send, Sparkles, TrendingDown, AlertTriangle, Lightbulb } from 'lucide-react';
import { useState } from 'react';

export const AIAssistant = () => {
  const [message, setMessage] = useState('');
  
  const insights = [
    {
      icon: TrendingDown,
      title: 'Расходы выросли на 15%',
      description: 'В этом месяце вы потратили на 12,000 ₽ больше, чем обычно. Основной рост в категории "Кафе и рестораны".',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-950'
    },
    {
      icon: AlertTriangle,
      title: 'Бюджет "Дом" почти исчерпан',
      description: 'Осталось 1,500 ₽ из 20,000 ₽. Будьте внимательны с расходами до конца месяца.',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-950'
    },
    {
      icon: Lightbulb,
      title: 'Совет по экономии',
      description: 'Приготовление кофе дома может сэкономить около 6,000 ₽ в месяц.',
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-100 dark:bg-violet-950'
    }
  ];

  const chatHistory = [
    {
      role: 'user',
      message: 'Сколько я потратил на кофе в этом месяце?'
    },
    {
      role: 'assistant',
      message: 'В марте вы потратили 4,200 ₽ на категорию "Кафе и рестораны". Это на 800 ₽ больше, чем в прошлом месяце.'
    },
    {
      role: 'user',
      message: 'Когда я смогу накопить на отпуск?'
    },
    {
      role: 'assistant',
      message: 'При текущем темпе накоплений (около 15,000 ₽/мес) вы достигнете цели в 150,000 ₽ примерно через 4 месяца. Рекомендую увеличить ежемесячные взносы до 20,000 ₽, чтобы успеть к июлю.'
    }
  ];

  return (
    <div className="pb-20 bg-background min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Ассистент</h1>
            <p className="text-xs text-muted-foreground">Умный анализ финансов</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Weekly Overview */}
        <div className="px-4 py-4">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" />
              <h2 className="font-bold">AI Обзор недели</h2>
            </div>
            <p className="text-sm opacity-90 mb-4">
              За последние 7 дней вы потратили 18,500 ₽ (на 12% больше обычного). 
              Доходы составили 100,000 ₽. Ваш баланс вырос на 81,500 ₽.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-xs opacity-80">Экономия</p>
                <p className="text-lg font-bold">+15%</p>
              </div>
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p className="text-xs opacity-80">Категорий</p>
                <p className="text-lg font-bold">8</p>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="px-4 py-4">
          <h3 className="font-bold mb-3">Важные инсайты</h3>
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div key={index} className="bg-card rounded-2xl p-4 border border-border">
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl ${insight.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${insight.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat History */}
        <div className="px-4 py-4">
          <h3 className="font-bold mb-3">История вопросов</h3>
          <div className="space-y-3">
            {chatHistory.map((chat, index) => (
              <div 
                key={index}
                className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl p-3 ${
                    chat.role === 'user' 
                      ? 'bg-violet-600 text-white' 
                      : 'bg-card border border-border'
                  }`}
                >
                  <p className="text-sm">{chat.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className="px-4 py-4 bg-card border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Спросите о ваших финансах..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 px-4 py-3 bg-muted rounded-xl outline-none focus:ring-2 focus:ring-violet-600"
          />
          <button className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-xl flex items-center justify-center">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Политика конфиденциальности</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        <section>
          <h2 className="text-lg font-bold mb-3">1. Общие положения</h2>
          <p className="text-muted-foreground leading-relaxed">
            Приложение Finly («Приложение») уважает вашу конфиденциальность и обязуется защищать ваши персональные данные. 
            Настоящая Политика конфиденциальности объясняет, как мы собираем, используем и храним вашу информацию.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">2. Сбор данных</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Приложение хранит следующие данные локально на вашем устройстве:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
            <li>Имя пользователя</li>
            <li>Финансовые транзакции (доходы и расходы)</li>
            <li>Категории транзакций</li>
            <li>Бюджеты и финансовые цели</li>
            <li>Настройки приложения</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">3. Хранение данных</h2>
          <p className="text-muted-foreground leading-relaxed">
            Все данные хранятся исключительно локально на вашем устройстве в базе данных IndexedDB. 
            Мы не передаём и не синхронизируем ваши данные с серверами. Доступ к данным имеет только это приложение.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">4. Использование данных</h2>
          <p className="text-muted-foreground leading-relaxed">
            Данные используются исключительно для предоставления функционала приложения:
            учёт финансов, аналитика расходов, планирование бюджетов и достижение финансовых целей.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">5. Защита данных</h2>
          <p className="text-muted-foreground leading-relaxed">
            Поскольку данные хранятся только на вашем устройстве, вы несёте ответственность 
            за защиту своего устройства от несанкционированного доступа.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">6. Права пользователя</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Вы имеете право:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
            <li>Получить копию всех ваших данных через функцию экспорта</li>
            <li>Удалить все данные через очистку приложения</li>
            <li>Выйти из аккаунта в любой момент</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">7. Изменения политики</h2>
          <p className="text-muted-foreground leading-relaxed">
            Мы можем обновлять настоящую Политику конфиденциальности. 
            Актуальная версия всегда доступна в приложении.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">8. Контакты</h2>
          <p className="text-muted-foreground leading-relaxed">
            По вопросам конфиденциальности обращайтесь: privacy@finly.app
          </p>
        </section>

        <p className="text-sm text-muted-foreground pt-6 border-t border-border">
          Последнее обновление: 20 марта 2026 г.
        </p>
      </div>
    </div>
  );
};

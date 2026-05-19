import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Условия использования</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        <section>
          <h2 className="text-lg font-bold mb-3">1. Принятие условий</h2>
          <p className="text-muted-foreground leading-relaxed">
            Используя приложение Finly («Приложение»), вы соглашаетесь с настоящими Условиями использования. 
            Если вы не согласны с условиями, пожалуйста, не используйте Приложение.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">2. Описание сервиса</h2>
          <p className="text-muted-foreground leading-relaxed">
            Finly — это персональное финансовое приложение для учёта доходов и расходов, 
            управления бюджетами и достижения финансовых целей. Приложение работает локально 
            на вашем устройстве без необходимости регистрации на сервере.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">3. Обязанности пользователя</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Вы обязуетесь:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
            <li>Использовать Приложение в законных целях</li>
            <li>Не пытаться взломать или модифицировать Приложение</li>
            <li>Не использовать Приложение для незаконной деятельности</li>
            <li>Самостоятельно контролировать точность вводимых данных</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">4. Интеллектуальная собственность</h2>
          <p className="text-muted-foreground leading-relaxed">
            Все права на Приложение, включая код, дизайн, логотипы и контент, принадлежат 
            разработчикам Finly. Копирование, распространение или модификация Приложения 
            без разрешения запрещены.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">5. Отказ от ответственности</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Приложение предоставляется «как есть» без каких-либо гарантий:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
            <li>Мы не гарантируем бесперебойную работу Приложения</li>
            <li>Мы не несём ответственности за потерю данных</li>
            <li>Мы не предоставляем финансовые консультации</li>
            <li>Мы не гарантируем точность аналитических расчётов</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">6. Ограничение ответственности</h2>
          <p className="text-muted-foreground leading-relaxed">
            В максимально допустимой законом степени разработчики Finly не несут ответственности 
            за любые прямые, косвенные, случайные или последующие убытки, связанные с использованием 
            или невозможностью использования Приложения.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">7. Прекращение доступа</h2>
          <p className="text-muted-foreground leading-relaxed">
            Мы оставляем за собой право ограничить или прекратить доступ к Приложению в случае 
            нарушения вами настоящих Условий.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">8. Изменения условий</h2>
          <p className="text-muted-foreground leading-relaxed">
            Мы можем обновлять настоящие Условия использования. Продолжение использования Приложения 
            после изменений означает ваше согласие с новыми Условиями.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">9. Применимое право</h2>
          <p className="text-muted-foreground leading-relaxed">
            Настоящие Условия регулируются законодательством Российской Федерации. 
            Все споры разрешаются в соответствии с действующим законодательством РФ.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">10. Контакты</h2>
          <p className="text-muted-foreground leading-relaxed">
            По вопросам, связанным с Условиями использования, обращайтесь: support@finly.app
          </p>
        </section>

        <p className="text-sm text-muted-foreground pt-6 border-t border-border">
          Последнее обновление: 20 марта 2026 г.
        </p>
      </div>
    </div>
  );
};

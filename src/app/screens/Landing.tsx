import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import {
  ArrowRight,
  Shield,
  Activity,
  Sparkles,
  Zap,
  Volume2,
  QrCode,
  Lock,
  Cloud,
  Check,
  Moon,
  Sun,
  Github,
  TrendingUp,
  ChevronRight,
  Send,
  Upload,
  Plus
} from 'lucide-react';

interface MockParsedResult {
  amount: number | null;
  type: 'income' | 'expense';
  category: string;
  categoryIcon: string;
  categoryColor: string;
  merchant: string | null;
  date: string;
}

export function Landing() {
  const navigate = useNavigate();
  const { setTheme, resolvedTheme } = useTheme();
  
  // Simulated Interactive Dashboard Mockup state
  const [mockTab, setMockTab] = useState<'dashboard' | 'analytics' | 'ai' | 'scanner'>('dashboard');
  const [mockBalance, setMockBalance] = useState(124500);
  const [mockTransactions, setMockTransactions] = useState([
    { id: '1', merchant: 'Старбакс', category: 'Кафе', icon: '☕', color: '#ef4444', amount: -450, date: 'Сегодня' },
    { id: '2', merchant: 'Зарплата', category: 'Доходы', icon: '💰', color: '#10b981', amount: 85000, date: 'Вчера' },
    { id: '3', merchant: 'Яндекс Go', category: 'Транспорт', icon: '🚗', color: '#3b82f6', amount: -650, date: '3 июня' }
  ]);
  
  // Simulated AI Assistant Chat State
  const [mockAiChat, setMockAiChat] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'user', content: 'Привет! Подскажи, смогу ли я накопить на отпуск, если продолжу тратить как сейчас?' },
    {
      role: 'assistant',
      content: 'Привет! Проанализировав ваши траты за последние 14 дней, вы откладываете в среднем 18% доходов. При текущем темпе вы накопите нужную сумму (100 000 ₽) к 15 августа 2026г. Чтобы ускориться на 2 недели, попробуйте сократить расходы на категорию "Продукты и кафе" на 15%.'
    }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiCustomInput, setAiCustomInput] = useState('');

  // Simulated Scanner State
  const [scannerStep, setScannerStep] = useState<'idle' | 'scanning' | 'done' | 'added'>('idle');
  const [scannerProgress, setScannerProgress] = useState(0);
  const [scannerResult, setScannerResult] = useState<{ merchant: string; amount: number; date: string; category: string } | null>(null);

  // Custom simulation event handlers
  const handleAskMockAi = (question: string, reply: string) => {
    if (isAiTyping) return;
    setMockAiChat(prev => [...prev, { role: 'user', content: question }]);
    setIsAiTyping(true);
    
    setTimeout(() => {
      setIsAiTyping(false);
      setMockAiChat(prev => [...prev, { role: 'assistant', content: reply }]);
    }, 1200);
  };

  const handleCustomAiSend = () => {
    if (!aiCustomInput.trim() || isAiTyping) return;
    const userText = aiCustomInput;
    setAiCustomInput('');
    setMockAiChat(prev => [...prev, { role: 'user', content: userText }]);
    setIsAiTyping(true);

    setTimeout(() => {
      setIsAiTyping(false);
      let replyText = 'Интересный вопрос. Я проанализировал ваши транзакции: у вас стабильный баланс, но расходы на развлечения немного выросли. Рекомендую установить недельный лимит в 3000 ₽.';
      
      const lower = userText.toLowerCase();
      if (lower.includes('сократ') || lower.includes('экономи')) {
        replyText = 'Вы можете сэкономить около 4 500 ₽ в месяц, если ограничите поездки на такси до 2 в неделю и сократите походы в рестораны на 15%.';
      } else if (lower.includes('прогноз') || lower.includes('месяц')) {
        replyText = 'Ваш прогнозируемый расход к концу месяца — 68 500 ₽. Это ниже установленного вами лимита в 75 000 ₽.';
      } else if (lower.includes('аномали') || lower.includes('подозрител')) {
        replyText = 'Выявлена одна крупная трата: покупка техники в DNS на сумму 15 000 ₽. Остальные расходы соответствуют вашему обычному паттерну.';
      }

      setMockAiChat(prev => [...prev, { role: 'assistant', content: replyText }]);
    }, 1000);
  };

  const handleStartSimulateScan = () => {
    if (scannerStep === 'scanning') return;
    setScannerStep('scanning');
    setScannerProgress(0);
    setScannerResult(null);
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setScannerProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setScannerResult({
          merchant: "Супермаркет 'Лента'",
          amount: 3850.20,
          date: new Date().toLocaleDateString('ru-RU'),
          category: "Продукты и кафе"
        });
        setScannerStep('done');
      }
    }, 150);
  };

  const handleAddScannerTransaction = () => {
    setScannerStep('added');
    
    setTimeout(() => {
      setMockTransactions(prev => [
        {
          id: String(Date.now()),
          merchant: "Супермаркет 'Лента'",
          category: "Продукты и кафе",
          icon: "🍴",
          color: "#ef4444",
          amount: -3850.20,
          date: "Сегодня"
        },
        ...prev
      ]);
      setMockBalance(b => b - 3850.20);
      setMockTab('dashboard');
      
      // Reset scanner state
      setScannerStep('idle');
      setScannerResult(null);
    }, 1500);
  };

  // Interactive AI Playground State
  const [nlpInput, setNlpInput] = useState('Кофе 450 рублей в Старбаксе');
  const [parsedResult, setParsedResult] = useState<MockParsedResult | null>({
    amount: 450,
    type: 'expense',
    category: 'Продукты и кафе',
    categoryIcon: 'Utensils',
    categoryColor: '#ef4444',
    merchant: 'Старбакc',
    date: new Date().toLocaleDateString('ru-RU'),
  });
  
  const [isParsing, setIsParsing] = useState(false);
  const playgroundRef = useRef<HTMLDivElement>(null);

  // Simple local parser simulation for the playground demo
  const handleSimulateParse = () => {
    if (!nlpInput.trim()) return;
    setIsParsing(true);
    
    setTimeout(() => {
      const text = nlpInput.toLowerCase();
      let amount: number | null = null;
      
      const numMatch = text.match(/(\d+)\s*(?:руб|р|\$|eur)/i) || text.match(/\b(\d+)\b/);
      if (numMatch) {
        amount = parseInt(numMatch[1]);
      }
      
      let type: 'income' | 'expense' = 'expense';
      let category = 'Разное';
      let categoryIcon = 'HelpCircle';
      let categoryColor = '#71717a';
      let merchant: string | null = null;

      // Simple rules for simulation
      if (text.includes('зарплат') || text.includes('аванс') || text.includes('доход') || text.includes('перевод от')) {
        type = 'income';
        category = 'Зарплата и доходы';
        categoryIcon = 'Coins';
        categoryColor = '#10b981';
      } else if (text.includes('кофе') || text.includes('ресторан') || text.includes('еда') || text.includes('кафе') || text.includes('старбакс') || text.includes('макдоналдс') || text.includes('бургер')) {
        category = 'Продукты и кафе';
        categoryIcon = 'Utensils';
        categoryColor = '#ef4444';
      } else if (text.includes('такси') || text.includes('метро') || text.includes('автобус') || text.includes('поезд') || text.includes('самолет') || text.includes('бензин')) {
        category = 'Транспорт';
        categoryIcon = 'Car';
        categoryColor = '#3b82f6';
      } else if (text.includes('подписк') || text.includes('яндекс') || text.includes('netflix') || text.includes('spotify') || text.includes('кино')) {
        category = 'Развлечения';
        categoryIcon = 'Clapperboard';
        categoryColor = '#8b5cf6';
      } else if (text.includes('аптек') || text.includes('врач') || text.includes('лекарств') || text.includes('спорт') || text.includes('фитнес')) {
        category = 'Здоровье и спорт';
        categoryIcon = 'HeartPulse';
        categoryColor = '#ec4899';
      } else if (text.includes('аренд') || text.includes('жкх') || text.includes('коммуналк') || text.includes('свет')) {
        category = 'Жилье';
        categoryIcon = 'Home';
        categoryColor = '#f59e0b';
      }

      // Extract merchant guesses
      if (text.includes('старбакс')) merchant = 'Старбакс';
      else if (text.includes('яндекс')) merchant = 'Яндекс';
      else if (text.includes('пятерочк') || text.includes('перекресток')) merchant = 'Супермаркет';
      else if (text.includes('такси')) merchant = 'Яндекс Такси';
      else {
        const words = nlpInput.split(/\s+/);
        // Find capitalized words that aren't start of sentence
        const potentialMerchants = words.filter((w, i) => i > 0 && /^[А-ЯA-Z]/.test(w) && !w.match(/\d/));
        if (potentialMerchants.length > 0) {
          merchant = potentialMerchants[0].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        }
      }

      setParsedResult({
        amount,
        type,
        category,
        categoryIcon,
        categoryColor,
        merchant,
        date: new Date().toLocaleDateString('ru-RU'),
      });
      setIsParsing(false);
    }, 600);
  };

  const handleSuggestClick = (suggestion: string) => {
    setNlpInput(suggestion);
    setIsParsing(true);
    setTimeout(() => {
      let amount = 1200;
      let type: 'income' | 'expense' = 'expense';
      let category = 'Разное';
      let categoryIcon = 'HelpCircle';
      let categoryColor = '#71717a';
      let merchant: string | null = null;

      if (suggestion.includes('Зарплата')) {
        amount = 95000;
        type = 'income';
        category = 'Зарплата и доходы';
        categoryIcon = 'Coins';
        categoryColor = '#10b981';
        merchant = 'МАИ Университет';
      } else if (suggestion.includes('Такси')) {
        amount = 650;
        category = 'Транспорт';
        categoryIcon = 'Car';
        categoryColor = '#3b82f6';
        merchant = 'Яндекс Go';
      } else if (suggestion.includes('Подписка')) {
        amount = 399;
        category = 'Развлечения';
        categoryIcon = 'Clapperboard';
        categoryColor = '#8b5cf6';
        merchant = 'Яндекс Плюс';
      }

      setParsedResult({
        amount,
        type,
        category,
        categoryIcon,
        categoryColor,
        merchant,
        date: new Date().toLocaleDateString('ru-RU'),
      });
      setIsParsing(false);
    }, 400);
  };

  const scrollToDemo = () => {
    playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' as const }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] overflow-hidden pointer-events-none -z-10 opacity-30 dark:opacity-20">
        <div className="absolute -top-[20%] left-[10%] w-[50%] aspect-square rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 blur-[120px] animate-pulse duration-[8s]" />
        <div className="absolute -top-[10%] right-[10%] w-[40%] aspect-square rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 blur-[100px] animate-pulse duration-[12s]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border transition-all">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-lg">
              F
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Finly
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Возможности</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Интерактив</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Тарифы</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Переключатель темы"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-light text-white text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all cursor-pointer"
            >
              Войти в приложение
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Ассистент &amp; Работа Оффлайн</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.15]">
            Управляйте финансами на уровне{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              будущего
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto font-normal leading-relaxed">
            Полностью автономный PWA финансовый менеджер с локальным искусственным интеллектом в вашем браузере. Работает в метро и самолете, сканирует чеки и надежно защищает вашу приватность.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              Начать бесплатно
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={scrollToDemo}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-secondary hover:bg-accent border border-border text-foreground font-semibold transition-all cursor-pointer"
            >
              Попробовать AI Демо
            </button>
          </div>
        </motion.div>

        {/* Dashboard Mockup Showcase */}
        <motion.div
          className="mt-16 md:mt-20 relative"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {/* Decorative glows */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur-xl pointer-events-none" />
          
          <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden p-3 md:p-5">
            {/* Window bar */}
            <div className="flex items-center gap-1.5 pb-4 border-b border-border/60 mb-4 px-2">
              <div className="w-3 h-3 rounded-full bg-destructive/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-muted-foreground ml-4 font-mono select-none">app.finly.io/dashboard</span>
            </div>

            {/* Mobile Tab Nav (Visible only on mobile) */}
            <div className="flex md:hidden bg-secondary/50 p-1.5 rounded-xl mb-4 text-xs font-semibold text-muted-foreground select-none">
              <button
                onClick={() => setMockTab('dashboard')}
                className={`flex-1 py-2 rounded-lg text-center transition-all active:scale-95 cursor-pointer ${
                  mockTab === 'dashboard' ? 'bg-card text-foreground shadow-sm' : ''
                }`}
              >
                Дашборд
              </button>
              <button
                onClick={() => setMockTab('analytics')}
                className={`flex-1 py-2 rounded-lg text-center transition-all active:scale-95 cursor-pointer ${
                  mockTab === 'analytics' ? 'bg-card text-foreground shadow-sm' : ''
                }`}
              >
                Аналитика
              </button>
              <button
                onClick={() => setMockTab('ai')}
                className={`flex-1 py-2 rounded-lg text-center transition-all active:scale-95 cursor-pointer ${
                  mockTab === 'ai' ? 'bg-card text-foreground shadow-sm' : ''
                }`}
              >
                ИИ-Чат
              </button>
              <button
                onClick={() => setMockTab('scanner')}
                className={`flex-1 py-2 rounded-lg text-center transition-all active:scale-95 cursor-pointer ${
                  mockTab === 'scanner' ? 'bg-card text-foreground shadow-sm' : ''
                }`}
              >
                Чеки
              </button>
            </div>

            {/* Interface simulation */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Sidebar simulation (hidden on mobile) */}
              <div className="hidden md:block md:col-span-3 border-r border-border/60 pr-4 space-y-4">
                <div className="h-8 w-28 bg-secondary rounded-lg mb-6 flex items-center justify-center font-bold text-sm tracking-widest text-indigo-500/80">FINLY</div>
                <div className="space-y-1">
                  <button
                    onClick={() => setMockTab('dashboard')}
                    className={`w-full h-10 rounded-lg flex items-center px-3 gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      mockTab === 'dashboard'
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Activity className="w-4 h-4" /> Дашборд
                  </button>
                  <button
                    onClick={() => setMockTab('analytics')}
                    className={`w-full h-10 rounded-lg flex items-center px-3 gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      mockTab === 'analytics'
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" /> Аналитика
                  </button>
                  <button
                    onClick={() => setMockTab('ai')}
                    className={`w-full h-10 rounded-lg flex items-center px-3 gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      mockTab === 'ai'
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" /> AI-Ассистент
                  </button>
                  <button
                    onClick={() => setMockTab('scanner')}
                    className={`w-full h-10 rounded-lg flex items-center px-3 gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      mockTab === 'scanner'
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <QrCode className="w-4 h-4" /> Сканер чеков
                  </button>
                </div>
              </div>

              {/* Main Content simulation */}
              <div className="md:col-span-9 space-y-5 min-h-[340px]">
                
                {/* 1. DASHBOARD TAB */}
                {mockTab === 'dashboard' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl border border-border bg-secondary/30">
                        <div className="text-xs text-muted-foreground font-medium mb-1">Баланс аккаунта</div>
                        <div className="text-xl md:text-2xl font-bold">{mockBalance.toLocaleString('ru-RU')} ₽</div>
                        <div className="text-[10px] text-emerald-500 font-semibold mt-1">▲ +14% в этом месяце</div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-secondary/30">
                        <div className="text-xs text-muted-foreground font-medium mb-1">Расходы за июнь</div>
                        <div className="text-xl md:text-2xl font-bold text-red-500">
                          {(124500 - mockBalance + 42800).toLocaleString('ru-RU')} ₽
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">Лимит бюджета: 75 000 ₽</div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-secondary/30">
                        <div className="text-xs text-muted-foreground font-medium mb-1">Накоплено на цели</div>
                        <div className="text-xl md:text-2xl font-bold text-violet-500">80 000 ₽</div>
                        <div className="text-[10px] text-violet-500 font-semibold mt-1">Цель: Отпуск (80%)</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      {/* Transaction Feed */}
                      <div className="sm:col-span-7 border border-border/80 rounded-xl p-4 space-y-3 bg-secondary/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">Последние транзакции</span>
                        <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                          {mockTransactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-2 hover:bg-secondary/40 rounded-lg transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-secondary text-base flex items-center justify-center font-bold">
                                  {tx.icon}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold">{tx.merchant}</div>
                                  <div className="text-[10px] text-muted-foreground">{tx.category} • {tx.date}</div>
                                </div>
                              </div>
                              <span className={`text-xs font-bold ${tx.amount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {tx.amount > 0 ? '+' : ''} {tx.amount.toLocaleString('ru-RU')} ₽
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Allocation chart mockup */}
                      <div className="sm:col-span-5 border border-border/80 rounded-xl p-4 flex flex-col justify-between bg-secondary/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Распределение</span>
                        <div className="h-28 flex items-end justify-around gap-2 px-2 pb-2">
                          <div className="w-8 bg-red-400 dark:bg-red-500/80 rounded-t h-[55%] relative group">
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded transition-opacity pointer-events-none whitespace-nowrap">Еда: 32%</div>
                          </div>
                          <div className="w-8 bg-blue-400 dark:bg-blue-500/80 rounded-t h-[30%] relative group">
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded transition-opacity pointer-events-none whitespace-nowrap">Транспорт: 15%</div>
                          </div>
                          <div className="w-8 bg-purple-400 dark:bg-purple-500/80 rounded-t h-[75%] relative group">
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded transition-opacity pointer-events-none whitespace-nowrap">Жилье: 40%</div>
                          </div>
                          <div className="w-8 bg-amber-400 dark:bg-amber-500/80 rounded-t h-[20%] relative group">
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded transition-opacity pointer-events-none whitespace-nowrap">Другое: 13%</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border pt-2">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Еда</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> Жилье</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Пути</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. ANALYTICS TAB */}
                {mockTab === 'analytics' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground font-medium mb-1">Сравнение месяц к месяцу</div>
                          <div className="text-sm font-bold text-emerald-500">▼ Расходы снизились на 12%</div>
                        </div>
                        <TrendingUp className="w-8 h-8 text-emerald-500/20" />
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground font-medium mb-1">Норма сбережений (июнь)</div>
                          <div className="text-sm font-bold text-indigo-500">49% (Идеально)</div>
                        </div>
                        <Activity className="w-8 h-8 text-indigo-500/20" />
                      </div>
                    </div>

                    {/* SVG Line Chart simulation */}
                    <div className="border border-border/80 rounded-xl p-4 bg-secondary/10">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Динамика баланса</span>
                      <div className="h-32 w-full relative">
                        <svg className="w-full h-full text-primary" viewBox="0 0 100 30" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3"/>
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <path d="M0 25 C10 23, 20 28, 30 18 C40 10, 50 15, 60 8 C70 2, 80 12, 90 5 C95 2, 100 2, 100 2 L100 30 L0 30 Z" fill="url(#chartGrad)"/>
                          <path d="M0 25 C10 23, 20 28, 30 18 C40 10, 50 15, 60 8 C70 2, 80 12, 90 5 C95 2, 100 2, 100 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-1 font-semibold">
                        <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. AI ASSISTANT TAB */}
                {mockTab === 'ai' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Chat Messages Log */}
                    <div className="border border-border/80 rounded-xl p-4 bg-secondary/10 h-[210px] flex flex-col justify-between">
                      <div className="space-y-2.5 overflow-y-auto max-h-[160px] pr-1 scrollbar-thin text-xs">
                        {mockAiChat.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-2.5 px-3 leading-relaxed shadow-sm ${
                              msg.role === 'user' 
                                ? 'bg-primary text-white rounded-tr-none' 
                                : 'bg-card border border-border text-foreground rounded-tl-none'
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {isAiTyping && (
                          <div className="flex justify-start">
                            <div className="bg-card border border-border text-foreground rounded-2xl rounded-tl-none p-2.5 px-3 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Custom input bar */}
                      <div className="flex gap-2 border-t border-border/60 pt-2.5">
                        <input
                          type="text"
                          value={aiCustomInput}
                          onChange={(e) => setAiCustomInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCustomAiSend()}
                          placeholder="Спросите ИИ о расходах..."
                          className="flex-1 bg-secondary/40 text-base md:text-[11px] px-3 py-2 rounded-lg border border-border focus:outline-none focus:border-primary"
                        />
                        <button
                          onClick={handleCustomAiSend}
                          className="p-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors active:scale-95 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Pre-defined Prompts (Horizontally scrollable on mobile) */}
                    <div className="flex overflow-x-auto gap-2 pb-1 pr-4 text-[10px] font-semibold scrollbar-none whitespace-nowrap snap-x scroll-smooth">
                      <button
                        onClick={() => handleAskMockAi(
                          'Как сократить расходы?', 
                          'Я вижу потенциал экономии: вы тратите на Кафе на 22% больше лимита. Если сократите визиты на 15% и уменьшите поездки на такси, вы сбережете до 4 500 ₽ в этом месяце.'
                        )}
                        className="px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95 snap-start cursor-pointer flex-shrink-0"
                      >
                        💡 Сократить расходы?
                      </button>
                      <button
                        onClick={() => handleAskMockAi(
                          'Дай прогноз на месяц', 
                          'С текущим темпом трат к 30 июня вы израсходуете 68 500 ₽ из лимита в 75 000 ₽. Свободный остаток бюджета составит около 6 500 ₽.'
                        )}
                        className="px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95 snap-start cursor-pointer flex-shrink-0"
                      >
                        📊 Мой прогноз?
                      </button>
                      <button
                        onClick={() => handleAskMockAi(
                          'Есть аномалии?', 
                          'Обнаружена одна аномалия: покупка техники в DNS на сумму 15 000 ₽. Она превышает ваш стандартный чек по категории Разное в 3.5 раза. Других отклонений нет.'
                        )}
                        className="px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95 snap-start cursor-pointer flex-shrink-0"
                      >
                        🛡️ Найти аномалии?
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 4. RECEIPT SCANNER TAB */}
                {mockTab === 'scanner' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-stretch"
                  >
                    {/* Simulated Receipt paper outline */}
                    <div className="sm:col-span-5 border border-dashed border-border/120 rounded-xl p-4 bg-secondary/5 flex flex-col items-center justify-center min-h-[140px] sm:min-h-[180px] relative overflow-hidden">
                      {scannerStep === 'scanning' && (
                        <>
                          <motion.div
                            animate={{ y: ["0%", "100%", "0%"] }}
                            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                            className="absolute left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] z-10"
                          />
                          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse z-20">OCR Распознавание...</div>
                        </>
                      )}
                      
                      {scannerStep === 'idle' && (
                        <div className="text-center space-y-2">
                          <Upload className="w-8 h-8 text-muted-foreground/60 mx-auto animate-bounce" />
                          <div className="text-[10px] font-bold text-muted-foreground uppercase">Демонстрационный чек</div>
                        </div>
                      )}

                      {scannerStep === 'done' && (
                        <div className="text-center space-y-1.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                            <Check className="w-5 h-5" />
                          </div>
                          <div className="text-[10px] font-bold text-emerald-500 uppercase">Чек успешно распознан</div>
                        </div>
                      )}

                      {scannerStep === 'added' && (
                        <div className="text-center space-y-1.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                            <Check className="w-5 h-5" />
                          </div>
                          <div className="text-[10px] font-bold text-indigo-500 uppercase">Добавлено в историю!</div>
                        </div>
                      )}
                    </div>

                    {/* Scan actions & info */}
                    <div className="sm:col-span-7 flex flex-col justify-between py-1">
                      {scannerStep === 'idle' && (
                        <div className="space-y-4">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Нажмите на кнопку ниже, чтобы запустить симуляцию ИИ-распознавания чека. Модель считает реквизиты и автоматически классифицирует затраты.
                          </p>
                          <button
                            onClick={handleStartSimulateScan}
                            className="w-full py-3 rounded-lg bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>Сканировать демо-чек</span>
                          </button>
                        </div>
                      )}

                      {scannerStep === 'scanning' && (
                        <div className="space-y-3 flex flex-col justify-center h-full">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>Обработка чека Ленты...</span>
                            <span>{scannerProgress}%</span>
                          </div>
                          <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-150" style={{ width: `${scannerProgress}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground italic">Обучение локальной ML-модели TensorFlow.js...</span>
                        </div>
                      )}

                      {scannerStep === 'done' && scannerResult && (
                        <div className="space-y-3.5">
                          <div className="border border-border bg-secondary/20 rounded-lg p-2.5 space-y-2 text-xs font-medium">
                            <div className="flex justify-between"><span className="text-muted-foreground">Магазин:</span> <span>{scannerResult.merchant}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Сумма чека:</span> <span className="font-extrabold text-red-500">-{scannerResult.amount.toLocaleString('ru-RU')} ₽</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Категория:</span> <span className="text-primary">{scannerResult.category}</span></div>
                          </div>
                          <button
                            onClick={handleAddScannerTransaction}
                            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Записать транзакцию</span>
                          </button>
                        </div>
                      )}

                      {scannerStep === 'added' && (
                        <div className="space-y-2 flex flex-col justify-center h-full text-center">
                          <div className="text-sm font-bold text-indigo-500">Баланс обновлен!</div>
                          <p className="text-[10px] text-muted-foreground">Вы будете перенаправлены на главный экран...</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-20 bg-secondary/20 border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">Технологии будущего на защите вашего бюджета</h2>
            <p className="text-muted-foreground font-normal">
              Мы объединили максимальную приватность оффлайн-приложения с мощностью современных искусственных нейронных сетей.
            </p>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {/* Feature 1 */}
            <motion.div className="p-6 rounded-2xl border border-border bg-card space-y-4 hover:shadow-lg transition-all hover:border-primary/30" variants={itemVariants}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Оффлайн-first &amp; PWA</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Приложение полностью работает без интернета. Данные хранятся локально в браузере с помощью IndexedDB. Установите Finly как PWA-приложение на экран телефона.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div className="p-6 rounded-2xl border border-border bg-card space-y-4 hover:shadow-lg transition-all hover:border-primary/30" variants={itemVariants}>
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Локальный ИИ на TensorFlow.js</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Нейросеть запускается прямо в браузере с использованием WebGL ускорения. Она распределяет расходы по категориям, обучается локально и не отправляет ваши данные на сервера.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div className="p-6 rounded-2xl border border-border bg-card space-y-4 hover:shadow-lg transition-all hover:border-primary/30" variants={itemVariants}>
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                <Volume2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Умный голосовой ввод</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Добавляйте транзакции на ходу с помощью Speech Recognition API. Просто скажите: «Обед в столовой 400 рублей» — и система автоматически заполнит форму.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div className="p-6 rounded-2xl border border-border bg-card space-y-4 hover:shadow-lg transition-all hover:border-primary/30" variants={itemVariants}>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Сканирование чеков (QR &amp; OCR)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Наведите камеру на QR-код фискального чека ФНС для моментального импорта суммы и даты или используйте встроенную нейросеть OCR для распознавания текстового чека.
              </p>
            </motion.div>

            {/* Feature 5 */}
            <motion.div className="p-6 rounded-2xl border border-border bg-card space-y-4 hover:shadow-lg transition-all hover:border-primary/30" variants={itemVariants}>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Биометрический замок (WebAuthn)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Защитите свои конфиденциальные данные от посторонних глаз. Быстрый вход по Face ID или Touch ID работает прямо на веб-странице без паролей.
              </p>
            </motion.div>

            {/* Feature 6 */}
            <motion.div className="p-6 rounded-2xl border border-border bg-card space-y-4 hover:shadow-lg transition-all hover:border-primary/30" variants={itemVariants}>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">100% Конфиденциальность</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Никакой контекстной рекламы, никаких скрытых трекеров и перепродажи данных третьим лицам. Ваши финансы остаются только вашей личной тайной.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Interactive AI Playground Section */}
      <section id="demo" ref={playgroundRef} className="py-20 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Попробуйте прямо сейчас</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Локальный парсинг естественного языка
            </h2>
            <p className="text-muted-foreground leading-relaxed font-normal">
              Больше не нужно долго открывать формы и выбирать категории. Наша NLP-модель понимает свободную речь. Введите трату обычным текстом, и ИИ разложит её на составляющие за миллисекунды.
            </p>
            
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase block">Примеры для клика:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSuggestClick('Зарплата 95000 рублей от МАИ')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-secondary hover:bg-accent border border-border text-foreground transition-all text-left cursor-pointer"
                >
                  💵 Зарплата от МАИ
                </button>
                <button
                  onClick={() => handleSuggestClick('Такси до вокзала за 650р в Яндекс Go')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-secondary hover:bg-accent border border-border text-foreground transition-all text-left cursor-pointer"
                >
                  🚕 Такси 650р в Яндекс Go
                </button>
                <button
                  onClick={() => handleSuggestClick('Подписка Яндекс Плюс 399 рублей')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-secondary hover:bg-accent border border-border text-foreground transition-all text-left cursor-pointer"
                >
                  🎬 Подписка Яндекс Плюс 399р
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xl space-y-6">
              <div className="space-y-2">
                <label htmlFor="nlp-demo-input" className="text-xs font-bold text-muted-foreground uppercase">Что вы потратили или заработали?</label>
                <div className="flex gap-2">
                  <input
                    id="nlp-demo-input"
                    type="text"
                    value={nlpInput}
                    onChange={(e) => setNlpInput(e.target.value)}
                    placeholder="Например: кофе 450р в Старбаксе вчера"
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-secondary/50 focus:outline-none focus:border-primary text-base md:text-sm font-medium transition-all"
                  />
                  <button
                    onClick={handleSimulateParse}
                    disabled={isParsing}
                    className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-light text-white text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isParsing ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Распознать</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Parsed Result Display */}
              {parsedResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="border border-border/80 rounded-xl p-5 bg-secondary/10 space-y-4"
                >
                  <span className="text-xs font-bold text-muted-foreground uppercase block">Распознанная транзакция</span>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                        style={{ backgroundColor: parsedResult.categoryColor }}
                      >
                        {parsedResult.categoryIcon === 'Utensils' && '🍴'}
                        {parsedResult.categoryIcon === 'Coins' && '💰'}
                        {parsedResult.categoryIcon === 'Car' && '🚗'}
                        {parsedResult.categoryIcon === 'Clapperboard' && '🎬'}
                        {parsedResult.categoryIcon === 'HeartPulse' && '❤️'}
                        {parsedResult.categoryIcon === 'Home' && '🏠'}
                        {parsedResult.categoryIcon === 'HelpCircle' && '❓'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {parsedResult.merchant || 'Не указан'}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: parsedResult.categoryColor }}
                          />
                          {parsedResult.category}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-lg font-extrabold ${parsedResult.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {parsedResult.type === 'income' ? '+' : '-'} {parsedResult.amount !== null ? `${parsedResult.amount.toLocaleString()} ₽` : '—'}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{parsedResult.date}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground font-medium block">Тип операции:</span>
                      <span className={`font-semibold ${parsedResult.type === 'income' ? 'text-emerald-500' : 'text-foreground'}`}>
                        {parsedResult.type === 'income' ? 'Доход' : 'Расход'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium block">Уверенность ИИ:</span>
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-primary/20" /> 98% (Локально)
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Tiers Section */}
      <section id="pricing" className="py-20 bg-secondary/15 border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight mb-4">Прозрачные тарифы под любые задачи</h2>
            <p className="text-muted-foreground font-normal">
              Пользуйтесь бесплатно локально или перейдите на Pro для облачной синхронизации и безлимитных облачных ИИ-возможностей.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 rounded-2xl border border-border bg-card space-y-6 flex flex-col justify-between hover:border-border/120 hover:shadow-md transition-all">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold">Free (Локально)</h3>
                  <p className="text-xs text-muted-foreground mt-1">Отличный старт для одного устройства</p>
                </div>
                <div className="text-3xl font-extrabold">0 ₽ <span className="text-sm font-medium text-muted-foreground">/ всегда</span></div>
                
                <div className="w-full h-px bg-border my-4" />
                
                <ul className="space-y-3 text-xs font-medium text-muted-foreground">
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    Оффлайн база данных IndexedDB
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    Локальный TensorFlow.js классификатор
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    Базовая аналитика и бюджеты
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 opacity-50" />
                    Лимит на ИИ чеки (3 сканирования / мес)
                  </li>
                  <li className="flex items-center gap-2 opacity-50">
                    <span className="w-4 text-center font-bold text-red-500">-</span>
                    Без синхронизации между устройствами
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 rounded-xl bg-secondary hover:bg-accent border border-border text-foreground font-bold transition-all mt-6 cursor-pointer"
              >
                Начать бесплатно
              </button>
            </div>

            {/* Pro Tier */}
            <div className="p-8 rounded-2xl border-2 border-primary bg-card space-y-6 flex flex-col justify-between shadow-xl shadow-primary/5 hover:shadow-primary/10 transition-all relative">
              <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                Рекомендуем
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-1.5">
                    Pro (Облако) <Sparkles className="w-4.5 h-4.5 text-primary" />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Для тех, кто ценит комфорт и надежность</p>
                </div>
                <div className="text-3xl font-extrabold">399 ₽ <span className="text-sm font-medium text-muted-foreground">/ месяц</span></div>
                
                <div className="w-full h-px bg-border my-4" />
                
                <ul className="space-y-3 text-xs font-medium text-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <strong>Синхронизация между устройствами в реальном времени</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    Безлимитный ИИ-ассистент (OpenRouter GPT/Claude)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    Безлимитное OCR и Vision сканирование чеков
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    Авто-обновление курсов валют (API)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    Глубокая аналитика и экспорт данных (CSV, JSON, PDF)
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-light text-white font-bold shadow-md shadow-primary/25 transition-all mt-6 cursor-pointer"
              >
                Попробовать Pro бесплатно (7 дней)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 md:py-28 text-center max-w-4xl mx-auto px-4">
        <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-950 text-white border border-indigo-500/20 shadow-2xl relative overflow-hidden">
          {/* Subtle backgrounds inside CTA */}
          <div className="absolute top-0 right-0 w-[40%] aspect-square rounded-full bg-violet-600/10 blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-[30%] aspect-square rounded-full bg-fuchsia-600/10 blur-[80px]" />
          
          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Готовы взять финансы под тотальный контроль?
            </h2>
            <p className="text-indigo-200/80 text-sm md:text-base leading-relaxed font-normal">
              Создайте профиль локально за 10 секунд и начните планировать бюджет с помощью передовых ИИ-технологий. Регистрация не требует кредитных карт.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-indigo-950 font-bold transition-all shadow-xl hover:scale-[1.02] inline-flex items-center gap-2 cursor-pointer"
            >
              Создать аккаунт бесплатно
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/10 py-12 text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">F</div>
            <span className="font-bold text-foreground">Finly</span>
            <span className="text-[10px] text-muted-foreground">© 2026</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            <a href="#features" className="hover:text-foreground transition-colors">Возможности</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Интерактив</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Тарифы</a>
            <button onClick={() => navigate('/privacy')} className="hover:text-foreground transition-colors bg-transparent border-none cursor-pointer">Конфиденциальность</button>
            <button onClick={() => navigate('/terms')} className="hover:text-foreground transition-colors bg-transparent border-none cursor-pointer">Правила</button>
          </div>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

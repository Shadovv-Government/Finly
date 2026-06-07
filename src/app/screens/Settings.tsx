import {
  Sun, Moon, Monitor, ChevronRight, Download, Upload, Bell, Repeat, LogOut,
  Pencil, Fingerprint, AlertTriangle, Target, FileJson, FileSpreadsheet, Sparkles,
  ImagePlus,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { motion } from 'motion/react';
import { sectionVariants } from '../utils/animations';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { Switch } from '../components/ui/switch';
import { Link } from 'react-router';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { BottomSheet } from '../components/BottomSheet';
import { exportToFile, exportCSVToFile, importFromFile, ImportResult } from '../../db/exportImport';
import { useNotifications } from '../hooks/useNotifications';
import { db } from '../../db/db';

// ==================== Helpers ====================

const AVATAR_COLORS = [
  'from-amber-400 to-pink-500',
  'from-indigo-500 to-blue-600',
  'from-blue-400 to-cyan-500',
  'from-green-400 to-emerald-500',
  'from-orange-400 to-red-500',
  'from-pink-400 to-rose-500',
];

const getInitial = (name: string) => name.charAt(0).toUpperCase();

// ==================== ProfileSection ====================

function ProfileSection() {
  const { user, updateProfile } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEditName = () => {
    if (user) {
      setEditName(user.name);
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveName = async () => {
    if (editName.trim().length >= 2) {
      await updateProfile({ name: editName.trim() });
      setIsEditDialogOpen(false);
    }
  };

  const handleAvatarSelect = async (color: string) => {
    await updateProfile({ avatarColor: color, avatarDataUrl: undefined });
    setIsAvatarDialogOpen(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const size = 200;
        const ratio = Math.min(size / img.width, size / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        await updateProfile({ avatarDataUrl: compressed });
        setIsAvatarDialogOpen(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = async () => {
    await updateProfile({ avatarDataUrl: undefined });
  };

  const hasPhoto = !!user?.avatarDataUrl;

  return (
    <div className="px-4 py-4">
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setIsAvatarDialogOpen(true)}
            className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold hover:opacity-90 transition-opacity ${
              !hasPhoto ? `bg-gradient-to-br ${user?.avatarColor || 'from-amber-400 to-pink-500'}` : ''
            }`}
          >
            {hasPhoto ? (
              <img src={user!.avatarDataUrl} alt="Аватар" className="w-full h-full object-cover" />
            ) : (
              user ? getInitial(user.name) : 'U'
            )}
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-lg">{user?.name || 'Гость'}</h2>
            <p className="text-sm text-muted-foreground">Локальный аккаунт</p>
          </div>
          <button
            onClick={handleEditName}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Pencil className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Валюта</span>
            <span className="text-sm text-muted-foreground">RUB (₽)</span>
          </div>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать имя</DialogTitle>
            <DialogDescription>
              Введите новое имя для отображения в приложении
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Ваше имя"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveName} disabled={editName.trim().length < 2}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выберите аватар</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleAvatarSelect(color)}
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white text-xl hover:scale-110 transition-transform ${
                  !hasPhoto && user?.avatarColor === color ? 'ring-4 ring-primary' : ''
                }`}
              >
                {getInitial(user?.name || 'U')}
              </button>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:scale-110 transition-transform"
            >
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
          {hasPhoto && (
            <div className="flex items-center justify-center pb-2">
              <button
                onClick={handleRemovePhoto}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Убрать фото
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== AppearanceSection ====================

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { reducedMotion, setReducedMotion } = useSettings();

  const themeOptions = [
    { value: 'light' as const, label: 'Светлая', icon: Sun },
    { value: 'dark' as const, label: 'Темная', icon: Moon },
    { value: 'system' as const, label: 'Системная', icon: Monitor },
  ];

  return (
    <>
      <div className="px-4 py-4">
        <h2 className="font-bold mb-3">Внешний вид</h2>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {themeOptions.map((option, index) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`w-full flex items-center justify-between p-4 ${
                  index !== themeOptions.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-primary text-white' : 'bg-muted'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{option.label}</span>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4">
        <h2 className="font-bold mb-3">Производительность</h2>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Минимум анимаций</p>
                <p className="text-xs text-muted-foreground">Для слабых устройств</p>
              </div>
            </div>
            <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== DataSection ====================

function DataSection() {
  const { notify } = useNotifications();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = async () => {
    try {
      await exportToFile('finly-export.json');
      notify('Экспорт завершён', 'Данные сохранены в JSON');
      setIsExportOpen(false);
    } catch {
      notify('Ошибка экспорта', 'Не удалось сохранить файл', 'error');
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportCSVToFile('finly-transactions.csv');
      notify('Экспорт завершён', 'Транзакции сохранены в CSV');
      setIsExportOpen(false);
    } catch {
      notify('Ошибка экспорта', 'Не удалось сохранить файл', 'error');
    }
  };

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result: ImportResult = await importFromFile(file);
      if (result.success) {
        const total = Object.values(result.imported).reduce((s: number, v: number) => s + v, 0);
        notify(
          'Импорт завершён',
          `Импортировано: ${total} записей` +
            (result.warnings.length > 0 ? ` (${result.warnings.length} предупреждений)` : '')
        );
      } else {
        notify(
          'Импорт с ошибками',
          result.errors.slice(0, 2).join('; ') || 'Не удалось импортировать данные'
        );
      }
    } catch {
      notify('Ошибка импорта', 'Не удалось прочитать файл', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [notify]);

  return (
    <div className="px-4 py-4">
      <h2 className="font-bold mb-3">Данные</h2>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <button
          onClick={() => setIsExportOpen(true)}
          className="w-full flex items-center gap-3 p-4 border-b border-border"
        >
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
            <Download className="w-5 h-5 text-green-600 dark:text-green-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Экспорт данных</p>
            <p className="text-xs text-muted-foreground">CSV или JSON</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="w-full flex items-center gap-3 p-4 disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
            <Upload className="w-5 h-5 text-blue-600 dark:text-blue-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Импорт данных</p>
            <p className="text-xs text-muted-foreground">
              {isImporting ? 'Импорт...' : 'Загрузить JSON'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />

      <BottomSheet isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} title="Экспорт данных">
        <div className="flex flex-col pb-4">
          <div className="px-4 py-4 space-y-3">
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center gap-4 p-4 bg-muted rounded-xl hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
                <FileJson className="w-6 h-6 text-primary dark:text-primary-light" />
              </div>
              <div className="text-left">
                <p className="font-medium">JSON</p>
                <p className="text-sm text-muted-foreground">Все данные: операции, категории, бюджеты, цели, настройки</p>
              </div>
            </button>

            <button
              onClick={handleExportCSV}
              className="w-full flex items-center gap-4 p-4 bg-muted rounded-xl hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">CSV</p>
                <p className="text-sm text-muted-foreground">Только транзакции — для открытия в Excel / Google Sheets</p>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// ==================== SecuritySection ====================

function SecuritySection() {
  const { biometric } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (biometric.isEnabled) {
        await biometric.disable();
      } else {
        await biometric.enable();
      }
    } catch {
      // пользователь отменил или ошибка — ничего не делаем
    } finally {
      setLoading(false);
    }
  };

  if (!biometric.isSupported) return null;

  return (
    <div className="px-4 py-4">
      <h2 className="font-bold mb-3">Безопасность</h2>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-primary dark:text-primary-light" />
            </div>
            <div>
              <p className="font-medium">Face ID / Отпечаток</p>
              <p className="text-xs text-muted-foreground">Блокировка через 5 минут</p>
            </div>
          </div>
          <Switch checked={biometric.isEnabled} onCheckedChange={handleToggle} disabled={loading} />
        </div>
      </div>
    </div>
  );
}

// ==================== Settings ====================

// ==================== StatsSection ====================

function StatsSection() {
  const [stats, setStats] = useState<{ txCount: number; catCount: number; goalCount: number; firstDate: string | null } | null>(null);

  useEffect(() => {
    Promise.all([
      db.transactions.count(),
      db.categories.count(),
      db.goals.count(),
      db.transactions.orderBy('date').first(),
    ]).then(([txCount, catCount, goalCount, firstTx]) => {
      setStats({
        txCount,
        catCount,
        goalCount,
        firstDate: firstTx ? new Date(firstTx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : null,
      });
    });
  }, []);

  if (!stats) return null;

  return (
    <div className="px-4 py-4">
      <h2 className="font-bold mb-3">Статистика</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-2xl font-bold">{stats.txCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Операций</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-2xl font-bold">{stats.catCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Категорий</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-2xl font-bold">{stats.goalCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Целей</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-sm font-bold leading-tight">{stats.firstDate ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Первая запись</p>
        </div>
      </div>
    </div>
  );
}

export const Settings = () => {
  const { logout } = useAuth();
  const {
    notifPush, setNotifPush,
    notifBudgets, setNotifBudgets,
    notifGoals, setNotifGoals,
    notifRecurring, setNotifRecurring,
  } = useSettings();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="pb-20 bg-background min-h-screen">
      <motion.section custom={0} variants={sectionVariants} initial="hidden" animate="visible">
      <div className="px-4 py-4 bg-card border-b border-border">
        <h1 className="text-xl font-bold">Настройки</h1>
      </div>
      </motion.section>

      <motion.section custom={1} variants={sectionVariants} initial="hidden" animate="visible">
      <ProfileSection />
      </motion.section>
      <motion.section custom={2} variants={sectionVariants} initial="hidden" animate="visible">
      <AppearanceSection />
      </motion.section>
      <motion.section custom={3} variants={sectionVariants} initial="hidden" animate="visible">
      <DataSection />
      </motion.section>
      <motion.section custom={4} variants={sectionVariants} initial="hidden" animate="visible">
      <SecuritySection />
      </motion.section>

      {/* Уведомления */}
      <motion.section custom={5} variants={sectionVariants} initial="hidden" animate="visible">
      <div className="px-4 py-4">
        <h2 className="font-bold mb-3">Уведомления</h2>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary dark:text-primary-light" />
              </div>
              <div>
                <p className="font-medium">Push-уведомления</p>
                <p className="text-xs text-muted-foreground">Браузерные уведомления</p>
              </div>
            </div>
            <Switch checked={notifPush} onCheckedChange={setNotifPush} />
          </div>

          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Бюджеты</p>
                <p className="text-xs text-muted-foreground">Превышение лимитов</p>
              </div>
            </div>
            <Switch checked={notifBudgets} onCheckedChange={setNotifBudgets} />
          </div>

          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <p className="font-medium">Цели</p>
                <p className="text-xs text-muted-foreground">Достижения и дедлайны</p>
              </div>
            </div>
            <Switch checked={notifGoals} onCheckedChange={setNotifGoals} />
          </div>

          <div className="flex items-center justify-between p-4">
            <Link to="/recurring" className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <Repeat className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              </div>
              <div>
                <p className="font-medium">Регулярные платежи</p>
                <p className="text-xs text-muted-foreground">Шаблоны платежей</p>
              </div>
            </Link>
            <Switch checked={notifRecurring} onCheckedChange={setNotifRecurring} />
          </div>
        </div>
      </div>
      </motion.section>

      {/* Статистика */}
      <motion.section custom={6} variants={sectionVariants} initial="hidden" animate="visible">
      <StatsSection />
      </motion.section>

      {/* О приложении */}
      <motion.section custom={8} variants={sectionVariants} initial="hidden" animate="visible">
      <div className="px-4 py-4">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <Link to="/components" className="w-full flex items-center justify-between p-4 border-b border-border">
            <span className="font-medium">Component Library</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>

          <Link to="/privacy" className="w-full flex items-center justify-between p-4 border-b border-border">
            <span className="font-medium">Политика конфиденциальности</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>

          <Link to="/terms" className="w-full flex items-center justify-between p-4">
            <span className="font-medium">Условия использования</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
      </div>
      </motion.section>

      {/* Выход */}
      <motion.section custom={9} variants={sectionVariants} initial="hidden" animate="visible">
      <div className="px-4 py-4">
        <button
          onClick={() => setShowLogoutDialog(true)}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-500 rounded-2xl font-medium disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
        </button>
      </div>
      </motion.section>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Выйти из аккаунта?</AlertDialogTitle>
            <AlertDialogDescription>
              Все данные останутся на этом устройстве. Вы сможете войти снова.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Выйти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

import { Sun, Moon, Monitor, ChevronRight, Download, Upload, Bell, Repeat, LogOut, Pencil, Fingerprint, AlertTriangle, Target, FileJson, FileSpreadsheet } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Switch } from '../components/ui/switch';
import { Link } from 'react-router';
import { useState, useRef, useCallback } from 'react';
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

export const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { user, updateProfile, logout, biometric } = useAuth();
  const { notify } = useNotifications();
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
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

  const handleLogout = async () => {
    if (window.confirm('Вы уверены, что хотите выйти? Все данные останутся на этом устройстве.')) {
      setIsLoggingOut(true);
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Светлая', icon: Sun },
    { value: 'dark', label: 'Темная', icon: Moon },
    { value: 'system', label: 'Системная', icon: Monitor },
  ] as const;

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const avatarColors = [
    'from-amber-400 to-pink-500',
    'from-violet-500 to-purple-600',
    'from-blue-400 to-cyan-500',
    'from-green-400 to-emerald-500',
    'from-orange-400 to-red-500',
    'from-pink-400 to-rose-500',
  ];

  const handleAvatarClick = () => {
    setIsAvatarDialogOpen(true);
  };

  const handleAvatarSelect = async (color: string) => {
    await updateProfile({ avatarColor: color });
    setIsAvatarDialogOpen(false);
  };

  const handleBiometricToggle = async () => {
    setBiometricLoading(true);
    try {
      if (biometric.isEnabled) {
        await biometric.disable();
      } else {
        await biometric.enable();
      }
    } catch {
      // пользователь отменил или ошибка — ничего не делаем
    } finally {
      setBiometricLoading(false);
    }
  };

  // Export handlers
  const handleExportJSON = async () => {
    try {
      await exportToFile('finly-export.json');
      notify('✅ Экспорт завершён', 'Данные сохранены в JSON');
      setIsExportOpen(false);
    } catch {
      notify('❌ Ошибка экспорта', 'Не удалось сохранить файл', 'error');
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportCSVToFile('finly-transactions.csv');
      notify('✅ Экспорт завершён', 'Транзакции сохранены в CSV');
      setIsExportOpen(false);
    } catch {
      notify('❌ Ошибка экспорта', 'Не удалось сохранить файл', 'error');
    }
  };

  // Import handler
  const handleImportClick = () => {
    fileInputRef.current?.click();
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
          '✅ Импорт завершён',
          `Импортировано: ${total} записей` +
            (result.warnings.length > 0 ? ` (${result.warnings.length} предупреждений)` : '')
        );
      } else {
        notify(
          '⚠️ Импорт с ошибками',
          result.errors.slice(0, 2).join('; ') || 'Не удалось импортировать данные'
        );
      }
    } catch {
      notify('❌ Ошибка импорта', 'Не удалось прочитать файл', 'error');
    } finally {
      setIsImporting(false);
      // Сбросить input, чтобы можно было выбрать тот же файл повторно
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [notify]);

  return (
    <div className="pb-20 bg-background min-h-screen">
      {/* Header */}
      <div className="px-4 py-4 bg-card border-b border-border">
        <h1 className="text-xl font-bold">Настройки</h1>
      </div>

      {/* Profile Section */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={handleAvatarClick}
              className={`w-16 h-16 rounded-full bg-gradient-to-br ${user?.avatarColor || 'from-amber-400 to-pink-500'} flex items-center justify-center text-white text-2xl font-bold hover:opacity-90 transition-opacity`}
            >
              {user ? getInitial(user.name) : 'U'}
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
              <button className="flex items-center gap-2 text-sm text-muted-foreground">
                RUB (₽)
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
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
                    isSelected ? 'bg-violet-600 text-white' : 'bg-muted'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{option.label}</span>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-violet-600"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Management */}
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
            onClick={handleImportClick}
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

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      {/* Security */}
      {biometric.isSupported && (
        <div className="px-4 py-4">
          <h2 className="font-bold mb-3">Безопасность</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-violet-600 dark:text-violet-500" />
                </div>
                <div>
                  <p className="font-medium">Face ID / Отпечаток</p>
                  <p className="text-xs text-muted-foreground">
                    Блокировка через 5 минут
                  </p>
                </div>
              </div>
              <Switch
                checked={biometric.isEnabled}
                onCheckedChange={handleBiometricToggle}
                disabled={biometricLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="px-4 py-4">
        <h2 className="font-bold mb-3">Уведомления</h2>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                <Bell className="w-5 h-5 text-violet-600 dark:text-violet-500" />
              </div>
              <div>
                <p className="font-medium">Push-уведомления</p>
                <p className="text-xs text-muted-foreground">Браузерные уведомления</p>
              </div>
            </div>
            <Switch defaultChecked />
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
            <Switch defaultChecked />
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
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <Repeat className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              </div>
              <div>
                <p className="font-medium">Регулярные платежи</p>
                <p className="text-xs text-muted-foreground">Напоминания о платежах</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      {/* About */}
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

      {/* Logout */}
      <div className="px-4 py-4">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-500 rounded-2xl font-medium disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
        </button>
      </div>

      {/* Edit Name Dialog */}
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

      {/* Avatar Selection Dialog */}
      <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выберите аватар</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {avatarColors.map((color) => (
              <button
                key={color}
                onClick={() => handleAvatarSelect(color)}
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white text-xl hover:scale-110 transition-transform ${
                  user?.avatarColor === color ? 'ring-4 ring-violet-600' : ''
                }`}
              >
                {getInitial(user?.name || 'U')}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export BottomSheet */}
      <BottomSheet
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Экспорт данных"
      >
        <div className="flex flex-col pb-4">
          <div className="px-4 py-4 space-y-3">
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center gap-4 p-4 bg-muted rounded-xl hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                <FileJson className="w-6 h-6 text-violet-600 dark:text-violet-500" />
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
};
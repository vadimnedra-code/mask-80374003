import { 
  X, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react';
import { Avatar } from './Avatar';
import { currentUser } from '@/data/mockData';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const menuItems = [
    { icon: User, label: 'Аккаунт', description: 'Профиль, номер телефона' },
    { icon: Bell, label: 'Уведомления', description: 'Звуки, вибрация' },
    { icon: Shield, label: 'Конфиденциальность', description: 'Блокировка, безопасность' },
    { icon: Palette, label: 'Оформление', description: 'Тема, фон чатов' },
    { icon: HelpCircle, label: 'Помощь', description: 'FAQ, связь с поддержкой' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right lg:relative lg:animate-none">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Настройки</h1>
      </div>

      <div className="overflow-y-auto h-[calc(100%-65px)] scrollbar-thin">
        {/* Profile Section */}
        <div className="p-6 flex flex-col items-center border-b border-border bg-card">
          <Avatar
            src={currentUser.avatar}
            alt={currentUser.name}
            size="xl"
            className="w-24 h-24"
          />
          <h2 className="mt-4 text-xl font-semibold">{currentUser.name}</h2>
          <p className="text-sm text-muted-foreground">+7 (999) 123-45-67</p>
          <p className="text-sm text-primary">@username</p>
        </div>

        {/* Theme Toggle */}
        <div className="p-4 border-b border-border">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-4">
              {isDark ? (
                <Moon className="w-5 h-5 text-primary" />
              ) : (
                <Sun className="w-5 h-5 text-primary" />
              )}
              <span className="font-medium">Тёмная тема</span>
            </div>
            <div
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                isDark ? 'bg-primary' : 'bg-muted'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-card shadow-sm transition-transform',
                  isDark ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </div>
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-4">
                <item.icon className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <button className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Выйти</span>
          </button>
        </div>

        {/* Version */}
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Mask Messenger v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

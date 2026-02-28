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
  Sun,
  Edit2,
  Trash2,
  FileText,
  ScrollText,
  ShieldCheck,
  UserPlus,
  BookOpen
} from 'lucide-react';
import { Avatar } from './Avatar';
import { ProfileEditPanel } from './ProfileEditPanel';
import { PrivacySettingsPanel } from './PrivacySettingsPanel';
import { NotificationSettingsPanel } from './NotificationSettingsPanel';
import { AppearanceSettingsPanel } from './AppearanceSettingsPanel';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { FeatureDescriptionDialog } from './FeatureDescriptionDialog';
import { InviteFriendDialog } from './InviteFriendDialog';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanelDB = ({ onClose }: SettingsPanelProps) => {
  const [isDark, setIsDark] = useState(() => {
    // Initialize from actual DOM state or localStorage
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             localStorage.getItem('theme') === 'dark';
    }
    return false;
  });
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, signOut } = useAuth();
  const { profile } = useProfile(user?.id);
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };
    
    checkAdminRole();
  }, [user?.id]);

  // Sync theme on mount
  useEffect(() => {
    const currentlyDark = document.documentElement.classList.contains('dark');
    setIsDark(currentlyDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const menuItems = [
    { icon: User, label: 'Аккаунт', description: 'Профиль, настройки' },
    { icon: Bell, label: 'Уведомления', description: 'Звуки, вибрация' },
    { icon: Shield, label: 'Конфиденциальность', description: 'Блокировка, безопасность' },
    { icon: Palette, label: 'Оформление', description: 'Тема, фон чатов' },
    { icon: HelpCircle, label: 'Помощь', description: 'FAQ, связь с поддержкой' },
  ];

  const legalItems = [
    { icon: FileText, label: 'Политика конфиденциальности', path: '/privacy' },
    { icon: ScrollText, label: 'Условия использования', path: '/terms' },
  ];

  if (showProfileEdit) {
    return <ProfileEditPanel onClose={() => setShowProfileEdit(false)} />;
  }

  if (showPrivacy) {
    return <PrivacySettingsPanel onClose={() => setShowPrivacy(false)} />;
  }

  if (showNotifications) {
    return <NotificationSettingsPanel onClose={() => setShowNotifications(false)} />;
  }

  if (showAppearance) {
    return <AppearanceSettingsPanel onClose={() => setShowAppearance(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right lg:relative lg:animate-none flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-semibold">Настройки</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pb-[env(safe-area-inset-bottom)]">
        {/* Profile Section */}
        <button 
          onClick={() => setShowProfileEdit(true)}
          className="w-full p-6 flex flex-col items-center border-b border-border bg-card hover:bg-muted/30 transition-colors group"
        >
          <div className="relative">
            <Avatar
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
              alt={profile?.display_name || 'User'}
              size="xl"
              className="w-24 h-24"
            />
            <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit2 className="w-3 h-3" />
            </div>
          </div>
          <h2 className="mt-4 text-xl font-display font-semibold">{profile?.display_name || 'Пользователь'}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {profile?.username && (
            <p className="text-sm text-primary">@{profile.username}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Нажмите для редактирования</p>
        </button>

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
              onClick={() => {
                if (item.label === 'Аккаунт') {
                  setShowProfileEdit(true);
                } else if (item.label === 'Конфиденциальность') {
                  setShowPrivacy(true);
                } else if (item.label === 'Уведомления') {
                  setShowNotifications(true);
                } else if (item.label === 'Оформление') {
                  setShowAppearance(true);
                }
              }}
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

        {/* Invite Friend */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => setShowInvite(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/15 hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <UserPlus className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Пригласить друга</p>
                <p className="text-xs text-muted-foreground">Поделиться ссылкой на MASK</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-primary/60 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Legal Links */}
        <div className="p-4 border-t border-border space-y-1">
          {legalItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-4">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>

        {/* Admin Panel Link (only for admins) */}
        {isAdmin && (
          <div className="p-4 border-t border-border space-y-2">
            <button 
              onClick={() => setShowFeatures(true)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-accent/30 border border-accent/20 hover:border-accent/40 transition-all group"
            >
              <div className="flex items-center gap-4">
                <BookOpen className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Описание функционала</p>
                  <p className="text-xs text-muted-foreground">Все возможности платформы</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary/60 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => {
                onClose();
                navigate('/admin');
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/15 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Панель администратора</p>
                  <p className="text-xs text-muted-foreground">Аналитика и управление</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary/60 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Logout & Delete Account */}
        <div className="p-4 border-t border-border space-y-2">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Выйти</span>
          </button>
          <button 
            onClick={() => setShowDeleteAccount(true)}
            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
          >
            <Trash2 className="w-5 h-5" />
            <span className="font-medium">Удалить аккаунт</span>
          </button>
        </div>

        {/* Version */}
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Mask Messenger v1.0.0</p>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        userEmail={user?.email || ''}
      />
      <InviteFriendDialog
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
      />
      <FeatureDescriptionDialog
        isOpen={showFeatures}
        onClose={() => setShowFeatures(false)}
      />
    </div>
  );
};

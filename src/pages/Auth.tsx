import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, User, Eye, EyeOff, ArrowLeft, Copy, Check, AlertTriangle, Key, Shield, Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedLogo } from '@/components/messenger/AnimatedLogo';

const newPasswordSchema = z.object({
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type AuthMode = 'key-login' | 'reset-password' | 'qr-register' | 'qr-show-key' | 'qr-confirm-saved' | 'qr-setup-name';

// Shared Venetian palazzo styles
const styles = {
  input: "pl-10 h-12 bg-background/60 border border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg",
  inputIcon: "absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-primary/50",
  label: "text-muted-foreground text-sm",
  button: "w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-sm transition-all duration-200",
  outlineButton: "border-border text-foreground hover:bg-accent font-medium rounded-lg",
  error: "text-sm text-destructive",
  card: "bg-card/40 rounded-lg p-4 border border-border",
  link: "w-full text-center text-sm text-primary hover:text-primary/80 transition-colors",
  sectionTitle: "text-lg font-display font-semibold text-foreground",
  sectionDesc: "text-sm text-muted-foreground mt-1",
} as const;

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState<AuthMode>('key-login');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [inputSecretKey, setInputSecretKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('mask-remember-me') === 'true';
  });

  const { updatePassword, signInAnonymously, updateDisplayName, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && authMode !== 'qr-setup-name') {
      navigate('/', { replace: true });
    }
  }, [user, authMode, navigate]);

  useEffect(() => {
    const mode = searchParams.get('mode');
    const type = searchParams.get('type');
    const isRecoveryHash = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
    if (mode === 'reset' || type === 'recovery' || isRecoveryHash) {
      setAuthMode('reset-password');
    } else if (mode === 'qr') {
      setAuthMode('qr-register');
    }
  }, [searchParams]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      rootOverflow: root?.style.overflow,
    };
    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    if (root) root.style.overflow = 'auto';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      if (root) root.style.overflow = prev.rootOverflow ?? '';
    };
  }, []);

  const resetForm = () => {
    setErrors({});
    setInputSecretKey('');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const validation = newPasswordSchema.safeParse({ password, confirmPassword });
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }
      const { error } = await updatePassword(password);
      if (error) { toast.error(error.message); }
      else { toast.success('Пароль изменён'); navigate('/', { replace: true }); }
    } catch { toast.error('Что-то пошло не так. Попробуйте позже.'); }
    finally { setLoading(false); }
  };

  const generateSecretKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = '';
    for (let s = 0; s < 6; s++) {
      for (let i = 0; i < 6; i++) key += chars[Math.floor(Math.random() * chars.length)];
      if (s < 5) key += '-';
    }
    return key;
  };

  const handleQrRegister = async () => {
    const newKey = generateSecretKey();
    setSecretKey(newKey);
    setKeyCopied(false);
    setAuthMode('qr-show-key');
  };

  const handleCopyKey = async () => {
    if (secretKey) {
      try {
        await navigator.clipboard.writeText(secretKey);
        setKeyCopied(true);
        toast.success('Ключ скопирован!');
      } catch { toast.error('Не удалось скопировать'); }
    }
  };

  const handleExportKeyToFile = () => {
    if (!secretKey) return;
    const content = `Mask - Secret Key\n========================================\nВаш секретный ключ для входа:\n\n${secretKey}\n\n========================================\nВАЖНО:\n- Храните этот файл в надёжном месте\n- Ключ нельзя восстановить\n- Без ключа вход в аккаунт невозможен\n========================================\nДата создания: ${new Date().toLocaleString('ru-RU')}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mask-secret-key-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Ключ сохранён в файл');
  };

  const handleConfirmKeySaved = () => setAuthMode('qr-confirm-saved');

  const handleProceedWithRegistration = async () => {
    if (!secretKey) return;
    setLoading(true);
    try {
      const { error, user: newUser } = await signInAnonymously();
      if (error) { toast.error('Ошибка регистрации. Попробуйте позже.'); setLoading(false); return; }
      if (newUser) {
        const { error: tokenError } = await supabase.functions.invoke('verify-login-token', {
          body: { action: 'generate', userId: newUser.id, secretKey: secretKey }
        });
        if (tokenError) { toast.error('Ошибка сохранения ключа'); setLoading(false); return; }
        setAuthMode('qr-setup-name');
      }
    } catch { toast.error('Что-то пошло не так. Попробуйте позже.'); }
    finally { setLoading(false); }
  };

  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const keyToUse = inputSecretKey.trim();
    if (!keyToUse) { setErrors({ secretKey: 'Введите секретный ключ' }); return; }
    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.functions.invoke('verify-login-token', {
        body: { action: 'login', secretKey: keyToUse }
      });
      if (verifyError || !data?.success) {
        if (data?.code === 'INVALID_KEY') toast.error('Неверный ключ');
        else if (data?.code === 'USER_NOT_FOUND') toast.error('Пользователь не найден');
        else toast.error('Ошибка входа');
        setLoading(false);
        return;
      }
      if (data.token_hash && data.email) {
        const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
        if (otpError) { toast.error('Ошибка авторизации'); setLoading(false); return; }
        toast.success(`С возвращением${data.displayName ? ', ' + data.displayName : ''}!`);
      } else { toast.error('Ошибка генерации сессии'); }
    } catch { toast.error('Что-то пошло не так'); }
    finally { setLoading(false); }
  };

  const handleSetupName = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!displayName.trim() || displayName.length < 2) { setErrors({ displayName: 'Имя должно содержать минимум 2 символа' }); return; }
    const trimmedUsername = username.trim();
    if (trimmedUsername && !/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) { setErrors({ username: 'Username: 3-20 символов, только латиница, цифры и _' }); return; }
    setLoading(true);
    try {
      const { error } = await updateDisplayName(displayName);
      if (error) { toast.error('Ошибка сохранения имени'); setLoading(false); return; }
      if (trimmedUsername) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) await supabase.from('profiles').update({ username: trimmedUsername }).eq('user_id', currentUser.id);
      }
      toast.success('Добро пожаловать, ' + displayName + '!');
      navigate('/', { replace: true });
    } catch { toast.error('Что-то пошло не так'); }
    finally { setLoading(false); }
  };

  const Spinner = () => (
    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
  );

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      {/* Subtle Venetian arch pattern at top */}
      <div className="h-44 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(210_10%_12%)] to-background" />
        {/* Faint diamond lattice overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23B9A36A' stroke-width='0.5'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z'/%3E%3C/g%3E%3C/svg%3E")`
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </div>
      
      <div className="flex-1 flex items-start justify-center px-4 -mt-24 relative z-10">
        <div className="w-full max-w-md bg-card/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-border">
          
          {/* Logo Header */}
          <div className="p-8 pb-6 text-center">
            <div className="flex justify-center mb-5">
              <AnimatedLogo size="md" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-gold-gradient italic tracking-tight">Mask</h1>
            <p className="text-sm text-muted-foreground mt-2 tracking-wide">Приватный мессенджер</p>
          </div>

          {/* Key Login */}
          {authMode === 'key-login' && (
            <div className="px-8 pb-8 space-y-6">
              <form onSubmit={handleKeyLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className={styles.label}>Секретный ключ</Label>
                  <div className="relative">
                    <Key className={styles.inputIcon} />
                    <Input
                      type="text"
                      placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                      value={inputSecretKey}
                      onChange={(e) => setInputSecretKey(e.target.value.toUpperCase())}
                      className={`${styles.input} font-mono text-sm`}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  {errors.secretKey && <p className={styles.error}>{errors.secretKey}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => {
                      setRememberMe(checked === true);
                      localStorage.setItem('mask-remember-me', String(checked === true));
                    }}
                    className="border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer select-none">
                    Запомнить меня
                  </Label>
                </div>

                <Button type="submit" disabled={loading || !inputSecretKey.trim()} className={styles.button}>
                  {loading ? <Spinner /> : 'Войти'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-4 text-muted-foreground tracking-widest">или</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => { setAuthMode('qr-register'); resetForm(); }}
                variant="outline"
                className={`w-full h-12 ${styles.outlineButton}`}
              >
                Создать аккаунт
              </Button>
            </div>
          )}

          {/* Reset Password */}
          {authMode === 'reset-password' && (
            <form onSubmit={handleResetPasswordSubmit} className="px-8 pb-8 space-y-4">
              <p className="text-center text-sm text-muted-foreground mb-4">Введите новый пароль</p>

              <div className="space-y-2">
                <Label className={styles.label}>Новый пароль</Label>
                <div className="relative">
                  <Lock className={styles.inputIcon} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${styles.input} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
                {errors.password && <p className={styles.error}>{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label className={styles.label}>Подтвердите пароль</Label>
                <div className="relative">
                  <Lock className={styles.inputIcon} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                  />
                </div>
                {errors.confirmPassword && <p className={styles.error}>{errors.confirmPassword}</p>}
              </div>

              <Button type="submit" disabled={loading} className={styles.button}>
                {loading ? <Spinner /> : 'Сохранить пароль'}
              </Button>
            </form>
          )}

          {/* QR Register */}
          {authMode === 'qr-register' && (
            <div className="px-8 pb-8 space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">
                  Вам будет выдан уникальный секретный ключ для входа
                </p>
              </div>

              <div className={styles.card}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Важно:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Ключ нельзя восстановить</li>
                      <li>Сохраните его в надёжном месте</li>
                      <li>Без ключа вход невозможен</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button onClick={handleQrRegister} disabled={loading} className={styles.button}>
                {loading ? <Spinner /> : 'Получить ключ'}
              </Button>

              <button type="button" onClick={() => { setAuthMode('key-login'); resetForm(); }} className={styles.link}>
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Назад к входу
              </button>
            </div>
          )}

          {/* QR Show Key */}
          {authMode === 'qr-show-key' && secretKey && (
            <div className="px-8 pb-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary/10 mb-3">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <h2 className={styles.sectionTitle}>Ваш секретный ключ</h2>
                <p className={styles.sectionDesc}>Сохраните его в надёжном месте</p>
              </div>

              <div className="bg-background/60 rounded-lg p-6 border border-primary/15">
                <p className="font-mono text-center text-primary text-base font-semibold tracking-wider break-all leading-relaxed">
                  {secretKey}
                </p>
              </div>

              <div className="bg-destructive/8 border border-destructive/15 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">Этот ключ показывается только один раз!</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCopyKey} variant="outline" className={`flex-1 h-12 ${styles.outlineButton} ${keyCopied ? 'border-primary text-primary bg-primary/5' : ''}`}>
                  {keyCopied ? <><Check className="w-4 h-4 mr-2" /> Скопировано</> : <><Copy className="w-4 h-4 mr-2" /> Копировать</>}
                </Button>
                <Button onClick={handleExportKeyToFile} variant="outline" className={`flex-1 h-12 ${styles.outlineButton}`}>
                  <Download className="w-4 h-4 mr-2" /> Сохранить
                </Button>
              </div>

              <Button onClick={handleConfirmKeySaved} className={styles.button}>
                Я сохранил ключ →
              </Button>
            </div>
          )}

          {/* QR Confirm Saved */}
          {authMode === 'qr-confirm-saved' && (
            <div className="px-8 pb-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary/15 mb-3">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <h2 className={styles.sectionTitle}>Готовы начать?</h2>
                <p className={styles.sectionDesc}>Убедитесь, что ключ сохранён</p>
              </div>

              <div className={styles.card}>
                <p className="font-mono text-sm text-primary/80 text-center break-all">{secretKey}</p>
              </div>

              <Button onClick={handleProceedWithRegistration} disabled={loading} className={styles.button}>
                {loading ? <Spinner /> : 'Создать аккаунт'}
              </Button>

              <button type="button" onClick={() => setAuthMode('qr-show-key')} className={styles.link}>
                ← Вернуться к ключу
              </button>
            </div>
          )}

          {/* Setup Name */}
          {authMode === 'qr-setup-name' && (
            <form onSubmit={handleSetupName} className="px-8 pb-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary/10 mb-3">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground">Как вас зовут?</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className={styles.label}>Ваше имя</Label>
                  <div className="relative">
                    <User className={styles.inputIcon} />
                    <Input
                      type="text"
                      placeholder="Введите имя"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={styles.input}
                      autoFocus
                    />
                  </div>
                  {errors.displayName && <p className={styles.error}>{errors.displayName}</p>}
                </div>

                <div className="space-y-2">
                  <Label className={styles.label}>Username (необязательно)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 font-medium text-sm">@</span>
                    <Input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                      className="pl-8 h-12 bg-background/60 border border-border text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/60">3-20 символов: латиница, цифры, _</p>
                  {errors.username && <p className={styles.error}>{errors.username}</p>}
                </div>
              </div>

              <Button type="submit" disabled={loading || !displayName.trim()} className={styles.button}>
                {loading ? <Spinner /> : 'Начать общение →'}
              </Button>
            </form>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="py-5 text-center relative z-10">
        <p className="text-[11px] text-muted-foreground/40 tracking-wider uppercase">
          Защита от просмотра сообщений третьими лицами
        </p>
      </div>
    </div>
  );
};

export default Auth;

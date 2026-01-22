import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, User, Eye, EyeOff, ArrowLeft, Zap, Copy, Check, AlertTriangle, Key, Shield, Download } from 'lucide-react';
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

  // Redirect when user is authenticated
  useEffect(() => {
    if (user && authMode !== 'qr-setup-name') {
      navigate('/');
    }
  }, [user, authMode, navigate]);

  // Check URL params for mode
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

  // Mobile scroll fix
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
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      const { error } = await updatePassword(password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Пароль изменён');
        navigate('/');
      }
    } catch (err) {
      toast.error('Что-то пошло не так. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Generate secret key
  const generateSecretKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = '';
    const segments = 6;
    const segmentLength = 6;

    for (let s = 0; s < segments; s++) {
      for (let i = 0; i < segmentLength; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        key += chars[randomIndex];
      }
      if (s < segments - 1) key += '-';
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
      } catch {
        toast.error('Не удалось скопировать');
      }
    }
  };

  const handleExportKeyToFile = () => {
    if (!secretKey) return;
    
    const content = `Mask - Secret Key
========================================
Ваш секретный ключ для входа:

${secretKey}

========================================
ВАЖНО:
- Храните этот файл в надёжном месте
- Ключ нельзя восстановить
- Без ключа вход в аккаунт невозможен
========================================
Дата создания: ${new Date().toLocaleString('ru-RU')}
`;

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

  const handleConfirmKeySaved = () => {
    setAuthMode('qr-confirm-saved');
  };

  const handleProceedWithRegistration = async () => {
    if (!secretKey) return;
    
    setLoading(true);
    try {
      const { error, user: newUser } = await signInAnonymously();
      if (error) {
        console.error('Anonymous signup error:', error);
        toast.error('Ошибка регистрации. Попробуйте позже.');
        setLoading(false);
        return;
      }
      
      if (newUser) {
        // Store the secret key
        const { error: tokenError } = await supabase.functions.invoke('verify-login-token', {
          body: { action: 'generate', userId: newUser.id, secretKey: secretKey }
        });
        
        if (tokenError) {
          console.error('Token generation error:', tokenError);
          toast.error('Ошибка сохранения ключа');
          setLoading(false);
          return;
        }
        
        setAuthMode('qr-setup-name');
      }
    } catch (err) {
      toast.error('Что-то пошло не так. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const keyToUse = inputSecretKey.trim();
    if (!keyToUse) {
      setErrors({ secretKey: 'Введите секретный ключ' });
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.functions.invoke('verify-login-token', {
        body: { action: 'login', secretKey: keyToUse }
      });

      if (verifyError || !data?.success) {
        if (data?.code === 'INVALID_KEY') {
          toast.error('Неверный ключ');
        } else if (data?.code === 'USER_NOT_FOUND') {
          toast.error('Пользователь не найден');
        } else {
          toast.error('Ошибка входа');
        }
        setLoading(false);
        return;
      }

      if (data.token_hash && data.email) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'magiclink'
        });

        if (otpError) {
          toast.error('Ошибка авторизации');
          setLoading(false);
          return;
        }

        toast.success(`С возвращением${data.displayName ? ', ' + data.displayName : ''}!`);
        // Navigation handled by useEffect
      } else {
        toast.error('Ошибка генерации сессии');
      }
    } catch (err) {
      toast.error('Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupName = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!displayName.trim() || displayName.length < 2) {
      setErrors({ displayName: 'Имя должно содержать минимум 2 символа' });
      return;
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername && !/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      setErrors({ username: 'Username: 3-20 символов, только латиница, цифры и _' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await updateDisplayName(displayName);
      if (error) {
        toast.error('Ошибка сохранения имени');
        setLoading(false);
        return;
      }
      
      if (trimmedUsername) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          await supabase
            .from('profiles')
            .update({ username: trimmedUsername })
            .eq('user_id', currentUser.id);
        }
      }
      
      toast.success('Добро пожаловать, ' + displayName + '!');
      navigate('/');
    } catch (err) {
      toast.error('Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0d0d0d] flex flex-col relative overflow-hidden">
      {/* Premium gradient header with golden accents */}
      <div className="h-40 bg-gradient-to-r from-amber-900/40 via-yellow-600/30 to-amber-900/40 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      </div>
      
      <div className="flex-1 flex items-start justify-center px-4 -mt-20 relative z-10">
        <div className="w-full max-w-md bg-gradient-to-b from-[#1a1a1a] to-[#141414] rounded-2xl shadow-2xl shadow-amber-900/20 overflow-hidden border border-amber-500/10">
          
          {/* Logo Header */}
          <div className="p-8 pb-6 text-center">
            <div className="flex justify-center mb-4">
              <AnimatedLogo size="md" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">Mask</h1>
            <p className="text-sm text-amber-100/60 mt-1">Премиальный защищённый мессенджер</p>
          </div>

          {/* Key Login */}
          {authMode === 'key-login' && (
            <div className="px-8 pb-8 space-y-6">
              <form onSubmit={handleKeyLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-amber-100/70 text-sm">Секретный ключ</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/60" />
                    <Input
                      type="text"
                      placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                      value={inputSecretKey}
                      onChange={(e) => setInputSecretKey(e.target.value.toUpperCase())}
                      className="pl-10 h-12 bg-black/40 border border-amber-500/20 text-amber-50 placeholder:text-amber-100/30 focus-visible:ring-1 focus-visible:ring-amber-500/50 font-mono text-sm"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  {errors.secretKey && <p className="text-sm text-red-400">{errors.secretKey}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => {
                      setRememberMe(checked === true);
                      localStorage.setItem('mask-remember-me', String(checked === true));
                    }}
                    className="border-amber-500/40 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <Label 
                    htmlFor="remember-me" 
                    className="text-sm text-amber-100/60 cursor-pointer select-none"
                  >
                    Запомнить меня
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !inputSecretKey.trim()}
                  className="w-full h-12 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    'Войти'
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-amber-500/20"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1a1a1a] px-4 text-amber-100/50">или</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => { setAuthMode('qr-register'); resetForm(); }}
                variant="outline"
                className="w-full h-12 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-medium rounded-xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Создать аккаунт
              </Button>
            </div>
          )}

          {/* Reset Password */}
          {authMode === 'reset-password' && (
            <form onSubmit={handleResetPasswordSubmit} className="px-8 pb-8 space-y-4">
              <p className="text-center text-sm text-amber-100/60 mb-4">
                Введите новый пароль
              </p>

              <div className="space-y-2">
                <Label className="text-amber-100/70 text-sm">Новый пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/60" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-black/40 border border-amber-500/20 text-amber-50 placeholder:text-amber-100/30 focus-visible:ring-1 focus-visible:ring-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500/60 hover:text-amber-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-amber-100/70 text-sm">Подтвердите пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/60" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 bg-black/40 border border-amber-500/20 text-amber-50 placeholder:text-amber-100/30 focus-visible:ring-1 focus-visible:ring-amber-500/50"
                  />
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-400">{errors.confirmPassword}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  'Сохранить пароль'
                )}
              </Button>
            </form>
          )}

          {/* QR Register - Initial */}
          {authMode === 'qr-register' && (
            <div className="px-8 pb-8 space-y-6">
              <div className="text-center">
                <p className="text-amber-100/60 text-sm">
                  Вам будет выдан уникальный секретный ключ для входа
                </p>
              </div>

              <div className="bg-black/40 rounded-xl p-4 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-100/60 space-y-1">
                    <p className="font-medium text-amber-200">Важно:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Ключ нельзя восстановить</li>
                      <li>Сохраните его в надёжном месте</li>
                      <li>Без ключа вход невозможен</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleQrRegister}
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Получить ключ
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => { setAuthMode('key-login'); resetForm(); }}
                className="w-full text-center text-sm text-amber-400 hover:underline"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Назад к входу
              </button>
            </div>
          )}

          {/* QR Show Key */}
          {authMode === 'qr-show-key' && secretKey && (
            <div className="px-8 pb-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 mb-3">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-lg font-medium text-amber-50">Ваш секретный ключ</h2>
                <p className="text-sm text-amber-100/60 mt-1">
                  Сохраните его в надёжном месте
                </p>
              </div>

              {/* Key display */}
              <div className="bg-black/40 rounded-xl p-6 border border-amber-500/30">
                <p className="font-mono text-center text-amber-400 text-lg font-bold tracking-wider break-all leading-relaxed">
                  {secretKey}
                </p>
              </div>

              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">
                    Этот ключ показывается только один раз!
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopyKey}
                  variant="outline"
                  className={`flex-1 h-12 rounded-xl transition-all ${
                    keyCopied 
                      ? 'border-amber-500 text-amber-400 bg-amber-500/10' 
                      : 'border-amber-500/30 text-amber-100 hover:bg-amber-500/10'
                  }`}
                >
                  {keyCopied ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      Копировать
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleExportKeyToFile}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-amber-500/30 text-amber-100 hover:bg-amber-500/10"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Сохранить
                </Button>
              </div>

              <Button
                onClick={handleConfirmKeySaved}
                className="w-full h-12 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/20"
              >
                Я сохранил ключ →
              </Button>
            </div>
          )}

          {/* QR Confirm Saved */}
          {authMode === 'qr-confirm-saved' && (
            <div className="px-8 pb-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 mb-3">
                  <Check className="w-6 h-6 text-black" />
                </div>
                <h2 className="text-lg font-medium text-amber-50">Готовы начать?</h2>
                <p className="text-sm text-amber-100/60 mt-1">
                  Убедитесь, что ключ сохранён
                </p>
              </div>

              <div className="bg-black/40 rounded-xl p-4 border border-amber-500/20">
                <p className="font-mono text-sm text-amber-300/80 text-center break-all">
                  {secretKey}
                </p>
              </div>

              <Button
                onClick={handleProceedWithRegistration}
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  'Создать аккаунт'
                )}
              </Button>

              <button
                type="button"
                onClick={() => setAuthMode('qr-show-key')}
                className="w-full text-center text-sm text-amber-400 hover:underline"
              >
                ← Вернуться к ключу
              </button>
            </div>
          )}

          {/* Setup Name */}
          {authMode === 'qr-setup-name' && (
            <form onSubmit={handleSetupName} className="px-8 pb-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 mb-3">
                  <User className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-lg font-medium text-amber-50">Как вас зовут?</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-amber-100/70 text-sm">Ваше имя</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/60" />
                    <Input
                      type="text"
                      placeholder="Введите имя"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10 h-12 bg-black/40 border border-amber-500/20 text-amber-50 placeholder:text-amber-100/30 focus-visible:ring-1 focus-visible:ring-amber-500/50"
                      autoFocus
                    />
                  </div>
                  {errors.displayName && <p className="text-sm text-red-400">{errors.displayName}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-100/70 text-sm">Username (необязательно)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/60 font-medium">@</span>
                    <Input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                      className="pl-8 h-12 bg-black/40 border border-amber-500/20 text-amber-50 placeholder:text-amber-100/30 focus-visible:ring-1 focus-visible:ring-amber-500/50"
                    />
                  </div>
                  <p className="text-xs text-amber-100/50">3-20 символов: латиница, цифры, _</p>
                  {errors.username && <p className="text-sm text-red-400">{errors.username}</p>}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !displayName.trim()}
                className="w-full h-12 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  'Начать общение →'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="py-4 text-center relative z-10">
        <p className="text-xs text-amber-100/40">
          Защита от просмотра сообщений третьими лицами
        </p>
      </div>
    </div>
  );
};

export default Auth;

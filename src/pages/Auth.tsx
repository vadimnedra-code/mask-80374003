import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MessageCircle, Lock, User, Eye, EyeOff, ArrowLeft, Zap, Copy, Check, AlertTriangle, Key, Shield } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

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
    <div className="min-h-[100dvh] bg-[#111b21] flex flex-col">
      {/* WhatsApp-style header pattern */}
      <div className="h-32 bg-[#00a884]" />
      
      <div className="flex-1 flex items-start justify-center px-4 -mt-16">
        <div className="w-full max-w-md bg-[#202c33] rounded-lg shadow-xl overflow-hidden">
          
          {/* Logo Header */}
          <div className="p-8 pb-6 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#00a884] mb-4">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#e9edef]">МАСК</h1>
            <p className="text-sm text-[#8696a0] mt-1">Безопасный мессенджер</p>
          </div>

          {/* Key Login */}
          {authMode === 'key-login' && (
            <div className="px-8 pb-8 space-y-6">
              <form onSubmit={handleKeyLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#8696a0] text-sm">Секретный ключ</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8696a0]" />
                    <Input
                      type="text"
                      placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                      value={inputSecretKey}
                      onChange={(e) => setInputSecretKey(e.target.value.toUpperCase())}
                      className="pl-10 h-12 bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0]/50 focus-visible:ring-1 focus-visible:ring-[#00a884] font-mono text-sm"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  {errors.secretKey && <p className="text-sm text-red-400">{errors.secretKey}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={loading || !inputSecretKey.trim()}
                  className="w-full h-12 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-medium rounded-lg"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Войти'
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#8696a0]/20"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#202c33] px-4 text-[#8696a0]">или</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => { setAuthMode('qr-register'); resetForm(); }}
                variant="outline"
                className="w-full h-12 border-[#00a884] text-[#00a884] hover:bg-[#00a884]/10 font-medium rounded-lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Создать аккаунт
              </Button>
            </div>
          )}

          {/* Reset Password */}
          {authMode === 'reset-password' && (
            <form onSubmit={handleResetPasswordSubmit} className="px-8 pb-8 space-y-4">
              <p className="text-center text-sm text-[#8696a0] mb-4">
                Введите новый пароль
              </p>

              <div className="space-y-2">
                <Label className="text-[#8696a0] text-sm">Новый пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8696a0]" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0]/50 focus-visible:ring-1 focus-visible:ring-[#00a884]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-[#8696a0] text-sm">Подтвердите пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8696a0]" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0]/50 focus-visible:ring-1 focus-visible:ring-[#00a884]"
                  />
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-400">{errors.confirmPassword}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-medium rounded-lg"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                <p className="text-[#8696a0] text-sm">
                  Вам будет выдан уникальный секретный ключ для входа
                </p>
              </div>

              <div className="bg-[#111b21] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#f7c94e] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#8696a0] space-y-1">
                    <p className="font-medium text-[#e9edef]">Важно:</p>
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
                className="w-full h-12 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-medium rounded-lg"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                className="w-full text-center text-sm text-[#00a884] hover:underline"
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
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#00a884]/20 mb-3">
                  <Shield className="w-6 h-6 text-[#00a884]" />
                </div>
                <h2 className="text-lg font-medium text-[#e9edef]">Ваш секретный ключ</h2>
                <p className="text-sm text-[#8696a0] mt-1">
                  Сохраните его в надёжном месте
                </p>
              </div>

              {/* Key display */}
              <div className="bg-[#111b21] rounded-lg p-6 border border-[#00a884]/30">
                <p className="font-mono text-center text-[#00a884] text-lg font-bold tracking-wider break-all leading-relaxed">
                  {secretKey}
                </p>
              </div>

              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">
                    Этот ключ показывается только один раз!
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCopyKey}
                variant="outline"
                className={`w-full h-12 rounded-lg transition-all ${
                  keyCopied 
                    ? 'border-[#00a884] text-[#00a884] bg-[#00a884]/10' 
                    : 'border-[#8696a0]/30 text-[#e9edef] hover:bg-[#2a3942]'
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
                    Копировать ключ
                  </>
                )}
              </Button>

              <Button
                onClick={handleConfirmKeySaved}
                className="w-full h-12 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-medium rounded-lg"
              >
                Я сохранил ключ →
              </Button>
            </div>
          )}

          {/* QR Confirm Saved */}
          {authMode === 'qr-confirm-saved' && (
            <div className="px-8 pb-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#00a884] mb-3">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-medium text-[#e9edef]">Готовы начать?</h2>
                <p className="text-sm text-[#8696a0] mt-1">
                  Убедитесь, что ключ сохранён
                </p>
              </div>

              <div className="bg-[#111b21] rounded-lg p-4">
                <p className="font-mono text-sm text-[#8696a0] text-center break-all">
                  {secretKey}
                </p>
              </div>

              <Button
                onClick={handleProceedWithRegistration}
                disabled={loading}
                className="w-full h-12 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-medium rounded-lg"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Создать аккаунт'
                )}
              </Button>

              <button
                type="button"
                onClick={() => setAuthMode('qr-show-key')}
                className="w-full text-center text-sm text-[#00a884] hover:underline"
              >
                ← Вернуться к ключу
              </button>
            </div>
          )}

          {/* Setup Name */}
          {authMode === 'qr-setup-name' && (
            <form onSubmit={handleSetupName} className="px-8 pb-8 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#00a884]/20 mb-3">
                  <User className="w-6 h-6 text-[#00a884]" />
                </div>
                <h2 className="text-lg font-medium text-[#e9edef]">Как вас зовут?</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#8696a0] text-sm">Ваше имя</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8696a0]" />
                    <Input
                      type="text"
                      placeholder="Введите имя"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10 h-12 bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0]/50 focus-visible:ring-1 focus-visible:ring-[#00a884]"
                      autoFocus
                    />
                  </div>
                  {errors.displayName && <p className="text-sm text-red-400">{errors.displayName}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-[#8696a0] text-sm">Username (необязательно)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0] font-medium">@</span>
                    <Input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                      className="pl-8 h-12 bg-[#2a3942] border-none text-[#e9edef] placeholder:text-[#8696a0]/50 focus-visible:ring-1 focus-visible:ring-[#00a884]"
                    />
                  </div>
                  <p className="text-xs text-[#8696a0]">3-20 символов: латиница, цифры, _</p>
                  {errors.username && <p className="text-sm text-red-400">{errors.username}</p>}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !displayName.trim()}
                className="w-full h-12 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-medium rounded-lg"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Начать общение →'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="py-4 text-center">
        <p className="text-xs text-[#8696a0]">
          Защита от просмотра сообщений третьими лицами
        </p>
      </div>
    </div>
  );
};

export default Auth;

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MessageCircle, Mail, Lock, User, Eye, EyeOff, ArrowLeft, QrCode, Upload, Download, Camera, Zap, Copy, Check, AlertTriangle, Key, Shield } from 'lucide-react';
import { z } from 'zod';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/client';

const resetPasswordSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

const newPasswordSchema = z.object({
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type AuthMode = 'key-login' | 'forgot-password' | 'reset-password' | 'qr-register' | 'qr-show-key' | 'qr-confirm-saved' | 'qr-setup-name' | 'qr-show-token' | 'qr-scan-login';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState<AuthMode>('key-login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [loginToken, setLoginToken] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [inputSecretKey, setInputSecretKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { resetPassword, updatePassword, signInAnonymously, updateDisplayName } = useAuth();
  const navigate = useNavigate();

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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const validation = resetPasswordSchema.safeParse({ email });
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

      const { error } = await resetPassword(email);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Проверьте почту для сброса пароля');
        setResetEmailSent(true);
      }
    } catch (err) {
      toast.error('Что-то пошло не так. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setErrors({});
    setResetEmailSent(false);
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

  // Generate a Bitcoin-style secret key
  const generateSecretKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
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
    // Generate and show the secret key first (before creating account)
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
        toast.error('Ошибка регистрации. Попробуйте позже.');
        return;
      }
      
      if (newUser) {
        // Store the SECRET KEY that user saved - not a new generated one
        const { data, error: tokenError } = await supabase.functions.invoke('verify-login-token', {
          body: { action: 'generate', userId: newUser.id, secretKey: secretKey }
        });
        
        if (tokenError) {
          console.error('Token generation error:', tokenError);
          toast.error('Ошибка сохранения ключа');
        } else {
          console.log('Secret key stored successfully');
        }
        
        setLoginToken(secretKey);
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
      // Verify the key with edge function
      const { data, error: verifyError } = await supabase.functions.invoke('verify-login-token', {
        body: { action: 'login', secretKey: keyToUse }
      });

      if (verifyError || !data?.success) {
        console.error('Key verification error:', verifyError, data);
        if (data?.code === 'INVALID_KEY') {
          toast.error('Неверный ключ. Проверьте правильность ввода.');
        } else if (data?.code === 'USER_NOT_FOUND') {
          toast.error('Пользователь не найден. Возможно, аккаунт был удалён.');
        } else {
          toast.error('Ошибка входа. Попробуйте позже.');
        }
        setLoading(false);
        return;
      }

      // Use the magic link token to sign in
      if (data.token_hash && data.email) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'magiclink'
        });

        if (otpError) {
          console.error('OTP verification error:', otpError);
          toast.error('Ошибка авторизации. Попробуйте ещё раз.');
          setLoading(false);
          return;
        }

        toast.success(`С возвращением${data.displayName ? ', ' + data.displayName : ''}!`);
        navigate('/');
      } else {
        toast.error('Ошибка генерации сессии');
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Что-то пошло не так. Попробуйте позже.');
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

    setLoading(true);
    try {
      const { error } = await updateDisplayName(displayName);
      if (error) {
        toast.error('Ошибка сохранения имени');
      } else {
        toast.success('Добро пожаловать, ' + displayName + '!');
        navigate('/');
      }
    } catch (err) {
      toast.error('Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQr = () => {
    const svg = document.getElementById('login-qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = 'mask-login-qr.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleScanQrFromImage = async (file: File) => {
    setLoading(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-hidden");
      const result = await html5QrCode.scanFile(file, true);
      
      // Check if it's a valid token (64 character hex string)
      if (result && /^[a-f0-9]{64}$/i.test(result)) {
        // Verify the token with the server
        const { data, error } = await supabase.functions.invoke('verify-login-token', {
          body: { action: 'verify', token: result }
        });

        if (error || !data?.success) {
          toast.error('Неверный или устаревший QR-код');
        } else {
          // Sign in anonymously and then we'd need to restore the session
          // For now, redirect with token
          toast.success('QR-код распознан! Входим...');
          
          // Store the token and try to authenticate
          // Since we can't directly create a session, we'll need to handle this differently
          // The edge function returns userId, so we can use signInAnonymously and swap
          window.location.href = `/?restore_token=${result}`;
        }
      } else {
        toast.error('QR-код не распознан');
      }
    } catch (err) {
      console.error('QR scan error:', err);
      toast.error('Не удалось прочитать QR-код');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleScanQrFromImage(file);
    }
  };

  const getTitle = () => {
    switch (authMode) {
      case 'key-login': return 'Вход по ключу';
      case 'forgot-password': return 'Восстановление пароля';
      case 'reset-password': return 'Новый пароль';
      case 'qr-register': return 'Мгновенная регистрация';
      case 'qr-show-key': return 'Ваш секретный ключ';
      case 'qr-confirm-saved': return 'Подтверждение';
      case 'qr-setup-name': return 'Как вас зовут?';
      case 'qr-show-token': return 'Сохраните QR-код';
      case 'qr-scan-login': return 'Войти по QR-коду';
      default: return '';
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 mb-4">
            <MessageCircle className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            МАСК
          </h1>
        </div>

        {/* Main Auth Screen - Key Login and Instant Registration */}
        {authMode === 'key-login' && (
          <div className="space-y-5 bg-gradient-to-b from-amber-950/20 to-orange-950/10 p-8 rounded-3xl shadow-medium border border-amber-500/20">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center border-2 border-amber-400/50">
                <Key className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-amber-100">Вход по ключу</h2>
              <p className="text-sm text-amber-200/70">
                Введите секретный ключ, который вы сохранили при регистрации
              </p>
            </div>

            <form onSubmit={handleKeyLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="secretKey" className="text-amber-200">Секретный ключ</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400/60" />
                  <Input
                    id="secretKey"
                    type="text"
                    placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                    value={inputSecretKey}
                    onChange={(e) => setInputSecretKey(e.target.value.toUpperCase())}
                    className="pl-10 h-12 rounded-xl bg-black/30 border-amber-500/30 text-amber-100 placeholder:text-amber-400/30 focus:border-amber-400/50 font-mono text-sm"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                {errors.secretKey && <p className="text-sm text-red-400">{errors.secretKey}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading || !inputSecretKey.trim()}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-lg shadow-lg shadow-amber-500/30 transition-all duration-300"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  'Войти'
                )}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-amber-500/20"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gradient-to-b from-amber-950/20 to-orange-950/10 px-3 text-amber-400/60">или</span>
              </div>
            </div>

            {/* Мгновенная регистрация */}
            <Button
              type="button"
              onClick={() => { setAuthMode('qr-register'); resetForm(); }}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-base shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-[1.02]"
            >
              <Zap className="w-6 h-6 mr-2" />
              Получить новый ключ
            </Button>
          </div>
        )}

        {/* Forgot Password Form */}
        {authMode === 'forgot-password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            <button
              type="button"
              onClick={() => { setAuthMode('key-login'); resetForm(); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>

            {resetEmailSent && (
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground">Письмо отправлено</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Откройте письмо и перейдите по ссылке, чтобы установить новый пароль. Если письма нет — проверьте папку «Спам».
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                resetEmailSent ? 'Отправить ещё раз' : 'Отправить ссылку'
              )}
            </Button>
          </form>
        )}

        {/* Reset Password Form (New Password) */}
        {authMode === 'reset-password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Введите новый пароль для вашего аккаунта
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Новый пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                'Сохранить пароль'
              )}
            </Button>
          </form>
        )}

        {/* QR Instant Registration - Initial Screen */}
        {authMode === 'qr-register' && (
          <div className="space-y-5 bg-gradient-to-b from-amber-950/20 to-orange-950/10 p-8 rounded-3xl shadow-medium border border-amber-500/20">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center border-2 border-amber-500/30">
                <Key className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-amber-100">Мгновенная регистрация</h2>
              <p className="text-sm text-amber-200/70">
                Вам будет выдан уникальный секретный ключ. Это ваш единственный способ входа — берегите его!
              </p>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/80 space-y-1">
                  <p className="font-semibold">Важно:</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-200/60">
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
              className="w-full h-14 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-lg shadow-lg shadow-amber-500/30 transition-all duration-300 hover:scale-[1.02]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-6 h-6 mr-2" />
                  Получить ключ
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => { setAuthMode('key-login'); resetForm(); }}
                className="text-amber-400 hover:underline font-medium"
              >
                ← Назад к входу
              </button>
            </p>
          </div>
        )}

        {/* QR Show Key - Bitcoin-style secret key display */}
        {authMode === 'qr-show-key' && secretKey && (
          <div className="space-y-5 bg-gradient-to-b from-amber-950/30 to-orange-950/20 p-8 rounded-3xl shadow-medium border border-amber-500/30">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/40 to-orange-500/30 flex items-center justify-center border-2 border-amber-400/50">
                <Shield className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-amber-100">Ваш секретный ключ</h2>
              <p className="text-sm text-amber-200/70">
                Запишите, сделайте скриншот или скопируйте этот ключ
              </p>
            </div>

            {/* Bitcoin-style key display */}
            <div className="bg-black/50 border-2 border-amber-500/40 rounded-2xl p-6 relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-amber-500/30 rounded-tl-lg" />
              <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-amber-500/30 rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-amber-500/30 rounded-bl-lg" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-amber-500/30 rounded-br-lg" />
              
              <div className="text-center py-4">
                <p className="font-mono text-lg md:text-xl text-amber-400 font-bold tracking-wider break-all leading-relaxed">
                  {secretKey}
                </p>
              </div>
            </div>

            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300/80">
                  <span className="font-bold">Внимание!</span> Этот ключ показывается только один раз. Если вы его потеряете, восстановить аккаунт будет невозможно.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleCopyKey}
                variant="outline"
                className={`w-full h-12 rounded-xl border-2 transition-all duration-300 ${
                  keyCopied 
                    ? 'border-green-500/50 bg-green-500/10 text-green-400' 
                    : 'border-amber-500/30 hover:border-amber-500/50 text-amber-200 hover:bg-amber-500/10'
                }`}
              >
                {keyCopied ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 mr-2" />
                    Скопировать ключ
                  </>
                )}
              </Button>

              <Button
                onClick={handleConfirmKeySaved}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-base shadow-lg shadow-amber-500/30 transition-all duration-300"
              >
                Я сохранил ключ
              </Button>
            </div>
          </div>
        )}

        {/* QR Confirm Saved - Confirmation before creating account */}
        {authMode === 'qr-confirm-saved' && (
          <div className="space-y-5 bg-gradient-to-b from-amber-950/30 to-orange-950/20 p-8 rounded-3xl shadow-medium border border-amber-500/30">
            <div className="text-center space-y-3">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/20 flex items-center justify-center border-2 border-green-400/50">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-green-100">Вы готовы войти?</h2>
              <p className="text-sm text-green-200/70">
                Убедитесь, что вы сохранили секретный ключ в надёжном месте
              </p>
            </div>

            <div className="bg-black/40 border border-amber-500/20 rounded-xl p-4">
              <p className="font-mono text-sm text-amber-400/80 text-center break-all">
                {secretKey}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleProceedWithRegistration}
                disabled={loading}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg shadow-lg shadow-green-500/30 transition-all duration-300"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Да, войти!'
                )}
              </Button>

              <Button
                onClick={() => setAuthMode('qr-show-key')}
                variant="ghost"
                className="w-full h-12 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              >
                ← Вернуться к ключу
              </Button>
            </div>
          </div>
        )}

        {/* QR Setup Name - After confirming key is saved */}
        {authMode === 'qr-setup-name' && (
          <form onSubmit={handleSetupName} className="space-y-5 bg-gradient-to-b from-green-950/20 to-emerald-950/10 p-8 rounded-3xl shadow-medium border border-green-500/20">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/20 flex items-center justify-center border-2 border-green-400/50">
                <User className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-green-100">Как вас зовут?</h2>
              <p className="text-sm text-green-200/70">
                Выберите имя, которое увидят другие пользователи
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-green-200">Ваше имя</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400/60" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Введите имя"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10 h-12 rounded-xl bg-black/30 border-green-500/30 text-green-100 placeholder:text-green-400/40 focus:border-green-400/50"
                  autoFocus
                />
              </div>
              {errors.displayName && <p className="text-sm text-red-400">{errors.displayName}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading || !displayName.trim()}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg shadow-lg shadow-green-500/30 transition-all duration-300"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Начать общение →'
              )}
            </Button>
          </form>
        )}

        {/* QR Show Token - Save your login QR code */}
        {authMode === 'qr-show-token' && loginToken && (
          <div className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                <Download className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold">Сохраните QR-код</h2>
              <p className="text-sm text-muted-foreground">
                Это ваш ключ для входа. Сохраните скриншот или скачайте картинку
              </p>
            </div>

            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-2xl shadow-md">
                <QRCodeSVG
                  id="login-qr-code"
                  value={loginToken}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleDownloadQr}
                variant="outline"
                className="w-full h-12 rounded-xl"
              >
                <Download className="w-5 h-5 mr-2" />
                Скачать QR-код
              </Button>

              <Button
                onClick={() => {
                  toast.success('Добро пожаловать!');
                  navigate('/');
                }}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
              >
                Продолжить
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              ⚠️ Без этого QR-кода вы не сможете войти снова!
            </p>
          </div>
        )}

        {/* QR Scan Login */}
        {authMode === 'qr-scan-login' && (
          <div className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            <button
              type="button"
              onClick={() => { setAuthMode('key-login'); resetForm(); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Войти по QR-коду</h2>
              <p className="text-sm text-muted-foreground">
                Загрузите сохранённый QR-код для входа
              </p>
            </div>

            <div id="qr-reader-hidden" style={{ display: 'none' }}></div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Загрузить QR-код
                </>
              )}
            </Button>
          </div>
        )}

        {/* Hidden element for QR scanning */}
        <div id="qr-reader-hidden" style={{ display: 'none' }}></div>
      </div>
    </div>
  );
};


export default Auth;

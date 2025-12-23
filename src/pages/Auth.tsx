import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Mail, Lock, User, Eye, EyeOff, Phone, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
const signInSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

const signUpSchema = z.object({
  displayName: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(50),
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

const phoneSchema = z.object({
  phone: z.string().min(10, 'Введите корректный номер телефона').regex(/^\+?[0-9]+$/, 'Номер должен содержать только цифры'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'Код должен содержать 6 цифр'),
});

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

type AuthMode = 'email-login' | 'email-signup' | 'phone-login' | 'phone-otp' | 'forgot-password' | 'reset-password';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState<AuthMode>('email-login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isNewUser, setIsNewUser] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { signIn, signUp, signInWithPhone, verifyOtp, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if we're in password reset mode (user clicked reset link in email)
  useEffect(() => {
    const mode = searchParams.get('mode');
    const type = searchParams.get('type');
    const isRecoveryHash = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');

    if (mode === 'reset' || type === 'recovery' || isRecoveryHash) {
      setAuthMode('reset-password');
    }
  }, [searchParams]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      if (authMode === 'email-login') {
        const validation = signInSchema.safeParse({ email, password });
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

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Ошибка входа',
              description: 'Неверный email или пароль',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Ошибка входа',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          navigate('/');
        }
      } else if (authMode === 'email-signup') {
        const validation = signUpSchema.safeParse({ email, password, confirmPassword, displayName });
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

        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Ошибка регистрации',
              description: 'Пользователь с таким email уже существует',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Ошибка регистрации',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Добро пожаловать!',
            description: 'Регистрация прошла успешно',
          });
          navigate('/');
        }
      }
    } catch (err) {
      toast({
        title: 'Ошибка',
        description: 'Что-то пошло не так. Попробуйте позже.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
        toast({
          title: 'Ошибка',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Письмо отправлено',
          description: 'Проверьте почту для сброса пароля',
        });
        setResetEmailSent(true);
      }
    } catch (err) {
      toast({
        title: 'Ошибка',
        description: 'Что-то пошло не так. Попробуйте позже.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const validation = phoneSchema.safeParse({ phone });
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

      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      const { error } = await signInWithPhone(formattedPhone);
      
      if (error) {
        toast({
          title: 'Ошибка',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Код отправлен',
          description: 'Введите код из SMS',
        });
        setAuthMode('phone-otp');
      }
    } catch (err) {
      toast({
        title: 'Ошибка',
        description: 'Что-то пошло не так. Попробуйте позже.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const validation = otpSchema.safeParse({ otp });
      if (!validation.success) {
        setErrors({ otp: 'Введите 6-значный код' });
        setLoading(false);
        return;
      }

      if (isNewUser && !displayName.trim()) {
        setErrors({ displayName: 'Введите ваше имя' });
        setLoading(false);
        return;
      }

      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      const { error } = await verifyOtp(formattedPhone, otp, isNewUser ? displayName : undefined);
      
      if (error) {
        toast({
          title: 'Ошибка',
          description: 'Неверный код. Попробуйте снова.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Добро пожаловать!',
          description: 'Вход выполнен успешно',
        });
        navigate('/');
      }
    } catch (err) {
      toast({
        title: 'Ошибка',
        description: 'Что-то пошло не так. Попробуйте позже.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setErrors({});
    setOtp('');
    setIsNewUser(false);
    setResetEmailSent(false);
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
        toast({
          title: 'Ошибка',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Пароль изменён',
          description: 'Вы можете войти с новым паролем',
        });
        navigate('/');
      }
    } catch (err) {
      toast({
        title: 'Ошибка',
        description: 'Что-то пошло не так. Попробуйте позже.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (authMode) {
      case 'email-login': return 'Войдите в аккаунт';
      case 'email-signup': return 'Создайте аккаунт';
      case 'phone-login': return 'Вход по телефону';
      case 'phone-otp': return 'Введите код из SMS';
      case 'forgot-password': return 'Восстановление пароля';
      case 'reset-password': return 'Новый пароль';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
            Mask
          </h1>
          <p className="text-muted-foreground mt-2">{getTitle()}</p>
        </div>

        {/* Email Login Form */}
        {authMode === 'email-login' && (
          <form onSubmit={handleEmailSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
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

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Пароль</Label>
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot-password'); resetForm(); }}
                  className="text-xs text-primary hover:underline"
                >
                  Забыли пароль?
                </button>
              </div>
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                'Войти'
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">или</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => { setAuthMode('phone-login'); resetForm(); }}
              className="w-full h-12 rounded-xl"
            >
              <Phone className="w-5 h-5 mr-2" />
              Войти по телефону
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Нет аккаунта?{' '}
              <button
                type="button"
                onClick={() => { setAuthMode('email-signup'); resetForm(); }}
                className="text-primary hover:underline font-medium"
              >
                Зарегистрироваться
              </button>
            </p>
          </form>
        )}

        {/* Email Signup Form */}
        {authMode === 'email-signup' && (
          <form onSubmit={handleEmailSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            <div className="space-y-2">
              <Label htmlFor="displayName">Имя</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Ваше имя"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
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
                'Зарегистрироваться'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{' '}
              <button
                type="button"
                onClick={() => { setAuthMode('email-login'); resetForm(); }}
                className="text-primary hover:underline font-medium"
              >
                Войти
              </button>
            </p>
          </form>
        )}

        {/* Phone Login Form */}
        {authMode === 'phone-login' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            <button
              type="button"
              onClick={() => { setAuthMode('email-login'); resetForm(); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>

            <div className="space-y-2">
              <Label htmlFor="phone">Номер телефона</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 999 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isNewUser"
                checked={isNewUser}
                onChange={(e) => setIsNewUser(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="isNewUser" className="text-sm text-muted-foreground cursor-pointer">
                Я новый пользователь
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                'Получить код'
              )}
            </Button>
          </form>
        )}

        {/* OTP Verification Form */}
        {authMode === 'phone-otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            <button
              type="button"
              onClick={() => { setAuthMode('phone-login'); resetForm(); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>

            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Код отправлен на номер</p>
              <p className="font-medium">{phone}</p>
            </div>

            {isNewUser && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Ваше имя</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Как вас зовут?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                  />
                </div>
                {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label>Код подтверждения</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {errors.otp && <p className="text-sm text-destructive text-center">{errors.otp}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                'Подтвердить'
              )}
            </Button>

            <button
              type="button"
              onClick={handlePhoneSubmit}
              disabled={loading}
              className="w-full text-sm text-primary hover:underline"
            >
              Отправить код повторно
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {authMode === 'forgot-password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            <button
              type="button"
              onClick={() => { setAuthMode('email-login'); resetForm(); }}
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
      </div>
    </div>
  );
};

export default Auth;

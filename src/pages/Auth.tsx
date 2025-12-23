import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Mail, Lock, User, Eye, EyeOff, ArrowRight, Phone, ArrowLeft } from 'lucide-react';
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

type AuthMode = 'email-login' | 'email-signup' | 'phone-login' | 'phone-otp';

const Auth = () => {
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

  const { signIn, signUp, signInWithPhone, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      const { error } = await verifyOtp(formattedPhone, otp, displayName || undefined);
      
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

  const resetToEmailLogin = () => {
    setAuthMode('email-login');
    setErrors({});
    setOtp('');
  };

  const resetToPhoneLogin = () => {
    setAuthMode('phone-login');
    setErrors({});
    setOtp('');
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
          <p className="text-muted-foreground mt-2">
            {authMode === 'email-login' && 'Войдите в свой аккаунт'}
            {authMode === 'email-signup' && 'Создайте новый аккаунт'}
            {authMode === 'phone-login' && 'Войти по номеру телефона'}
            {authMode === 'phone-otp' && 'Введите код из SMS'}
          </p>
        </div>

        {/* Email Login/Signup Form */}
        {(authMode === 'email-login' || authMode === 'email-signup') && (
          <form onSubmit={handleEmailSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            {authMode === 'email-signup' && (
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
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName}</p>
                )}
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
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
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
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {authMode === 'email-signup' && (
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
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {authMode === 'email-login' ? 'Войти' : 'Зарегистрироваться'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">или</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setAuthMode('phone-login')}
              className="w-full h-12 rounded-xl"
            >
              <Phone className="w-5 h-5 mr-2" />
              Войти по номеру телефона
            </Button>
          </form>
        )}

        {/* Phone Login Form */}
        {authMode === 'phone-login' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            <div className="space-y-2">
              <Label htmlFor="displayName">Имя (необязательно)</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Номер телефона</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 999 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Введите номер в международном формате (например, +79991234567)
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Получить код
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={resetToEmailLogin}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Войти через Email
            </Button>
          </form>
        )}

        {/* OTP Verification Form */}
        {authMode === 'phone-otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Код отправлен на номер
              </p>
              <p className="font-medium">{phone}</p>
            </div>

            <div className="space-y-4">
              <Label className="text-center block">Введите код из SMS</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                >
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
              {errors.otp && (
                <p className="text-sm text-destructive text-center">{errors.otp}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-90 transition-opacity"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Подтвердить
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOtp('');
                  handlePhoneSubmit(new Event('submit') as any);
                }}
                disabled={loading}
                className="w-full text-sm"
              >
                Отправить код повторно
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetToPhoneLogin}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Изменить номер
              </Button>
            </div>
          </form>
        )}

        {/* Toggle for Email modes */}
        {(authMode === 'email-login' || authMode === 'email-signup') && (
          <p className="text-center mt-6 text-muted-foreground">
            {authMode === 'email-login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'email-login' ? 'email-signup' : 'email-login');
                setErrors({});
              }}
              className="text-primary font-medium hover:underline"
            >
              {authMode === 'email-login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;

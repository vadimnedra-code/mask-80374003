import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Phone, User, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const phoneSchema = z.object({
  phone: z.string().min(10, 'Введите корректный номер телефона').regex(/^\+?[0-9]+$/, 'Номер должен содержать только цифры'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'Код должен содержать 6 цифр'),
});

type AuthMode = 'phone-login' | 'phone-otp';

const Auth = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('phone-login');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isNewUser, setIsNewUser] = useState(false);

  const { signInWithPhone, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

      // Если новый пользователь, проверяем имя
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

  const resetToPhoneLogin = () => {
    setAuthMode('phone-login');
    setErrors({});
    setOtp('');
    setIsNewUser(false);
  };

  const getTitle = () => {
    switch (authMode) {
      case 'phone-login': return 'Войдите по номеру телефона';
      case 'phone-otp': return 'Введите код из SMS';
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

        {/* Phone Login Form */}
        {authMode === 'phone-login' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-5 bg-card p-8 rounded-3xl shadow-medium border border-border">
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
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
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
              onClick={resetToPhoneLogin}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>

            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Код отправлен на номер
              </p>
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
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Код подтверждения</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
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
      </div>
    </div>
  );
};

export default Auth;

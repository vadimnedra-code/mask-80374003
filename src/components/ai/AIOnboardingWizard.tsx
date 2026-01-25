import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Zap, Check, ChevronRight, Lock, Eye, EyeOff, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAISettings } from '@/hooks/useAISettings';
import maskLogo from '@/assets/mask-logo.png';

interface AIOnboardingWizardProps {
  onComplete: () => void;
}

type PrivacyPreset = 'max_privacy' | 'balanced' | 'max_comfort';

const PRIVACY_PRESETS = [
  {
    id: 'max_privacy' as PrivacyPreset,
    icon: Shield,
    title: 'Максимальная приватность',
    description: 'Никакой памяти. Каждый разговор — чистый лист.',
    features: ['Без сохранения истории', 'Инкогнито по умолчанию', 'Нет анализа чатов'],
    color: 'from-purple-500/20 to-purple-600/5',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400',
  },
  {
    id: 'balanced' as PrivacyPreset,
    icon: Sparkles,
    title: 'Баланс',
    description: 'Локальная память на устройстве. Удобство без компромиссов.',
    features: ['Локальное хранилище', 'PIN-защита памяти', 'Контроль над данными'],
    color: 'from-amber-500/20 to-amber-600/5',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  {
    id: 'max_comfort' as PrivacyPreset,
    icon: Zap,
    title: 'Максимальный комфорт',
    description: 'Зашифрованная облачная память. AI помнит всё важное.',
    features: ['Синхронизация устройств', 'E2E шифрование', 'Умные подсказки'],
    color: 'from-emerald-500/20 to-emerald-600/5',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
];

const STEPS = [
  { id: 'welcome', title: 'Добро пожаловать' },
  { id: 'privacy', title: 'Приватность' },
  { id: 'features', title: 'Возможности' },
  { id: 'complete', title: 'Готово' },
];

export const AIOnboardingWizard = ({ onComplete }: AIOnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<PrivacyPreset>('balanced');
  const [createVault, setCreateVault] = useState(false);
  const { completeOnboarding } = useAISettings();

  const handleComplete = async () => {
    await completeOnboarding(selectedPreset);
    onComplete();
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const skipOnboarding = () => {
    handleComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col"
    >
      {/* Progress bar */}
      <div className="pt-[env(safe-area-inset-top)] px-6 py-4">
        <div className="flex gap-2">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                idx <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center justify-center min-h-full text-center py-12"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-24 h-24 mb-8 rounded-none overflow-hidden bg-black"
              >
                <img src={maskLogo} alt="MASK" className="w-full h-full object-contain" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-4"
              >
                Я — <span className="text-primary">MASK Guide</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-lg mb-8 max-w-sm"
              >
                Помогу настроить приватность за 60 секунд.
                <br />
                Потом исчезну.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 text-sm text-muted-foreground mb-12"
              >
                <Timer className="w-4 h-4" />
                <span>~60 секунд</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col gap-3 w-full max-w-xs"
              >
                <Button
                  onClick={nextStep}
                  className="w-full h-12 text-lg bg-primary hover:bg-primary/90"
                >
                  Настроить за 60 секунд
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={skipOnboarding}
                  className="w-full text-muted-foreground"
                >
                  Пропустить
                </Button>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-8"
            >
              <h2 className="text-2xl font-bold mb-2 text-center">Что важнее?</h2>
              <p className="text-muted-foreground text-center mb-8">
                Выбери свой уровень приватности
              </p>

              <div className="space-y-4">
                {PRIVACY_PRESETS.map((preset) => (
                  <motion.button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "w-full p-4 rounded-2xl text-left transition-all",
                      "bg-gradient-to-r border",
                      preset.color,
                      selectedPreset === preset.id
                        ? `${preset.borderColor} border-2`
                        : "border-border/50"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-xl bg-background/50", preset.iconColor)}>
                        <preset.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{preset.title}</h3>
                          {selectedPreset === preset.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {preset.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {preset.features.map((feature) => (
                            <span
                              key={feature}
                              className="text-xs px-2 py-1 rounded-full bg-background/50"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <Button
                onClick={nextStep}
                className="w-full h-12 mt-8 text-lg"
              >
                Продолжить
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="features"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-8"
            >
              <h2 className="text-2xl font-bold mb-2 text-center">Первая магия</h2>
              <p className="text-muted-foreground text-center mb-8">
                Создать приватный сейф-чат?
              </p>

              <div className="space-y-4 mb-8">
                <motion.button
                  onClick={() => setCreateVault(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full p-6 rounded-2xl text-left transition-all",
                    "bg-gradient-to-r from-primary/20 to-primary/5 border",
                    createVault ? "border-primary border-2" : "border-border/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/20">
                      <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Создать сейф-чат</h3>
                        {createVault && <Check className="w-5 h-5 text-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Личное пространство для заметок, паролей и важного
                      </p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setCreateVault(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full p-4 rounded-2xl text-center transition-all border",
                    !createVault ? "border-muted-foreground/30" : "border-border/50"
                  )}
                >
                  <span className="text-muted-foreground">Не сейчас</span>
                </motion.button>
              </div>

              <div className="bg-muted/30 rounded-2xl p-4 mb-8">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Что я умею
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Настраивать приватность
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Отвечать на вопросы о MASK
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Суммировать переписки
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Составлять ответы
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Переводить сообщения
                  </li>
                </ul>
              </div>

              <Button
                onClick={nextStep}
                className="w-full h-12 text-lg"
              >
                Продолжить
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center justify-center min-h-full text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-8"
              >
                <Check className="w-10 h-10 text-primary" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-4">Всё готово</h2>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Теперь ты хозяин. Я ухожу в тень.
              </p>
              <p className="text-sm text-primary mb-8">
                В MASK тень — признак свободы.
              </p>

              <div className="bg-muted/30 rounded-2xl p-4 mb-8 text-sm text-left max-w-sm">
                <p className="text-muted-foreground mb-2">Позови меня:</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Вкладка <span className="text-primary font-medium">AI</span> внизу
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Команда <span className="font-mono text-primary">/ai</span> в чате
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    Кнопка <span className="text-primary font-medium">AI</span> в настройках
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleComplete}
                className="w-full max-w-xs h-12 text-lg"
              >
                Начать
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

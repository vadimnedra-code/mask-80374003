import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, Sparkles, Shield, Zap } from 'lucide-react';

interface OnboardingStep {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  gradient: string;
}

const steps: OnboardingStep[] = [
  {
    id: 'masks',
    icon: <Sparkles className="w-8 h-8" />,
    emoji: '🎭',
    title: 'Маски',
    subtitle: 'Одна личность — много образов',
    description: 'Создавайте разные профили для работы, семьи и друзей. Переключайтесь одним движением.',
    features: [
      '💼 Рабочий — для коллег и партнёров',
      '😊 Личный — для друзей',
      '🏠 Семья — для близких',
      '🎭 Инкогнито — полная анонимность'
    ],
    gradient: 'from-amber-500/20 via-orange-500/10 to-rose-500/20'
  },
  {
    id: 'privacy',
    icon: <Shield className="w-8 h-8" />,
    emoji: '🔒',
    title: 'Приватность',
    subtitle: 'Ваши данные — только ваши',
    description: 'Полный контроль над тем, что видят другие. Настройте видимость для каждой маски отдельно.',
    features: [
      '🛡️ Скрытие номера телефона',
      '👁️ Управление статусом онлайн',
      '⏱️ Исчезающие сообщения',
      '🚫 Защита от скриншотов'
    ],
    gradient: 'from-blue-500/20 via-cyan-500/10 to-teal-500/20'
  },
  {
    id: 'stability',
    icon: <Zap className="w-8 h-8" />,
    emoji: '⚡',
    title: 'Стабильность',
    subtitle: 'Молниеносно и надёжно',
    description: 'Сообщения доставляются мгновенно. Звонки без задержек. Работает даже при слабом интернете.',
    features: [
      '🚀 Мгновенная доставка сообщений',
      '📞 HD аудио и видео звонки',
      '📴 Офлайн режим с синхронизацией',
      '🔄 Автоматическое восстановление'
    ],
    gradient: 'from-violet-500/20 via-purple-500/10 to-fuchsia-500/20'
  }
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      localStorage.setItem('mask-onboarding-complete', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('mask-onboarding-complete', 'true');
    onComplete();
  };

  const step = steps[currentStep];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.9
    })
  };

  return (
    <div className="fixed inset-0 bg-surface-base flex flex-col overflow-hidden">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} transition-all duration-700`} />
      
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-tr from-secondary/10 to-transparent blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Skip button */}
      <div className="relative z-10 flex justify-end p-4 safe-area-top">
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          Пропустить
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="w-full max-w-md flex flex-col items-center text-center"
          >
            {/* Icon */}
            <motion.div
              className="w-24 h-24 rounded-3xl bg-glass-heavy backdrop-blur-xl flex items-center justify-center mb-8 shadow-layered-lg"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2
              }}
            >
              <span className="text-5xl">{step.emoji}</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-4xl font-bold text-foreground mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {step.title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-lg text-primary font-medium mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {step.subtitle}
            </motion.p>

            {/* Description */}
            <motion.p
              className="text-muted-foreground mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {step.description}
            </motion.p>

            {/* Features */}
            <motion.div
              className="w-full space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {step.features.map((feature, index) => (
                <motion.div
                  key={feature}
                  className="bg-glass-light backdrop-blur-sm rounded-xl px-4 py-3 text-left text-sm text-foreground/90"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  {feature}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="relative z-10 px-6 pb-8 safe-area-bottom">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'w-8 bg-primary' 
                  : index < currentStep
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-muted-foreground/30'
              }`}
              animate={{
                scale: index === currentStep ? [1, 1.1, 1] : 1
              }}
              transition={{
                duration: 0.5,
                repeat: index === currentStep ? Infinity : 0,
                repeatDelay: 1
              }}
            />
          ))}
        </div>

        {/* Next button */}
        <Button
          onClick={handleNext}
          className="w-full h-14 text-lg font-semibold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-layered-md"
        >
          {currentStep === steps.length - 1 ? (
            'Начать'
          ) : (
            <>
              Далее
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

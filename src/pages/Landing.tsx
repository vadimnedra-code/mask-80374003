import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Timer, PhoneCall, Ghost, Users } from 'lucide-react';
import { AnimatedLogo } from '@/components/messenger/AnimatedLogo';

const features = [
  {
    icon: Lock,
    title: 'Сквозное шифрование',
    text: 'Сообщения шифруются на устройстве по протоколу Signal (X3DH + Double Ratchet). Ключи не покидают ваш телефон.',
  },
  {
    icon: Ghost,
    title: 'Анонимный вход',
    text: 'Без телефона и почты. Регистрация по секретному ключу — личность не привязана к вашим данным.',
  },
  {
    icon: Timer,
    title: 'Исчезающие сообщения',
    text: 'Таймер удаления, отзыв отправленного и эфемерные приглашения в группы.',
  },
  {
    icon: PhoneCall,
    title: 'Защищённые звонки',
    text: 'Аудио и видео через WebRTC с шифрованием, групповые звонки до 8 участников.',
  },
  {
    icon: Users,
    title: 'Группы и медиа',
    text: 'Групповые чаты, голосовые сообщения, фото и файлы — всё под шифрованием.',
  },
  {
    icon: ShieldCheck,
    title: 'Приватность по умолчанию',
    text: 'Никакой аналитики поведения, хеширование IP и минимум метаданных.',
  },
];

const Landing = () => {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-20">
        <header className="flex flex-col items-center text-center">
          <AnimatedLogo size="md" />
          <h1 className="mt-8 font-display text-4xl leading-tight md:text-6xl">
            Mask — приватный мессенджер со сквозным шифрованием
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Анонимное общение без номера телефона и почты: шифрование на устройстве,
            исчезающие сообщения, защищённые звонки и группы.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-primary px-8 text-sm font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
            >
              Войти или создать аккаунт
            </Link>
            <a
              href="#features"
              className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-border px-8 text-sm font-medium tracking-wide transition-colors hover:bg-accent"
            >
              Как это работает
            </a>
          </div>
        </header>

        <section id="features" className="mt-20 md:mt-28">
          <h2 className="font-display text-2xl md:text-3xl">Возможности</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-lg border border-border bg-card p-6">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 font-display text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 md:mt-28">
          <h2 className="font-display text-2xl md:text-3xl">Начало за три шага</h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              ['1', 'Создайте аккаунт', 'Мы выдадим секретный ключ — сохраните его, он и есть ваш вход.'],
              ['2', 'Добавьте контакты', 'По QR-коду, ссылке-приглашению или защищённому поиску.'],
              ['3', 'Общайтесь', 'Сообщения, файлы, голос и звонки — всё зашифровано.'],
            ].map(([n, title, text]) => (
              <li key={n} className="rounded-lg border border-border p-6">
                <span className="font-display text-3xl text-primary">{n}</span>
                <h3 className="mt-3 font-display text-lg">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-20 flex flex-col items-center gap-3 border-t border-border pt-8 text-sm text-muted-foreground md:mt-28">
          <nav className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground">Политика конфиденциальности</Link>
            <Link to="/terms" className="hover:text-foreground">Условия использования</Link>
          </nav>
          <p>© {new Date().getFullYear()} Mask</p>
        </footer>
      </div>
    </main>
  );
};

export default Landing;

import { X, MessageSquare, Shield, Phone, Users, Bot, Palette, Bell, Search, Lock, FileText, Image, Mic, Star, Clock, UserPlus, BarChart3, Ban, Zap, Globe, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FeatureDescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const featureSections = [
  {
    title: 'Система пользователей',
    icon: Users,
    features: [
      'Регистрация и авторизация по email с подтверждением',
      'Профиль: имя, username, аватар, био, телефон',
      'Статус онлайн/офлайн с настройкой видимости',
      'Последний визит (last seen) с приватностью',
      'Токены входа для мультиустройств',
    ],
  },
  {
    title: 'Чаты',
    icon: MessageSquare,
    features: [
      'Личные чаты (1-на-1)',
      'Групповые чаты с ролями (owner/admin/member)',
      'Превью последнего сообщения в списке',
      'Счётчик непрочитанных сообщений',
      'Закрепление (pin) и архивирование чатов',
      'Блокировка чатов (locked chats)',
      'Мьют чатов с таймером',
      'Удаление чатов',
    ],
  },
  {
    title: 'Сообщения',
    icon: FileText,
    features: [
      'Текстовые сообщения с оптимистичной отправкой',
      'Редактирование и удаление своих сообщений',
      'Удаление для всех (48ч лимит)',
      'Ответ на сообщение (reply)',
      'Пересылка сообщений (forward)',
      'Индикатор набора текста (typing)',
      'Статусы: ✓ отправлено, ✓✓ доставлено, синие ✓✓ прочитано',
      'Пагинация по 50 сообщений с подгрузкой при скролле',
      'Реакции эмодзи на сообщения',
      'Избранные сообщения (saved/starred)',
      'Исчезающие сообщения (TTL: 24ч, 7д, 90д)',
      'Поиск по сообщениям',
      'Разделители по датам',
    ],
  },
  {
    title: 'Медиа',
    icon: Image,
    features: [
      'Отправка изображений с превью',
      'Отправка видео',
      'Отправка файлов с иконкой типа',
      'Голосовые сообщения с записью и плеером',
      'Медиа-галерея с навигацией (lightbox)',
      'Безопасное хранилище (private bucket chat-media)',
      'Signed URL для медиа-файлов',
    ],
  },
  {
    title: 'Звонки',
    icon: Phone,
    features: [
      'Голосовые и видео-звонки (WebRTC)',
      'Групповые звонки (mesh, до 8 участников)',
      'Входящие звонки с диалогом принятия',
      'Индикатор качества соединения',
      'Диагностика звонков',
      'Выбор мелодии звонка и вибрации',
      'ICE-кандидаты через Supabase Realtime',
      'TURN-сервер через Edge Function',
    ],
  },
  {
    title: 'Шифрование (E2EE)',
    icon: Lock,
    features: [
      'Signal Protocol (X3DH + Double Ratchet)',
      'Identity keys, signed prekeys, one-time prekeys',
      'Prekey bundles для обмена ключами',
      'Шифрование/дешифрование на клиенте',
      'Индикатор E2EE в чатах',
      'Fallback для нешифрованных сообщений',
    ],
  },
  {
    title: 'Группы',
    icon: Users,
    features: [
      'Создание групповых чатов',
      'Роли: owner, admin, member',
      'Инвайт-ссылки с паролем и лимитом использований',
      'Добавление участников в чат',
      'Список участников с ролями',
      'Никнеймы контактов',
    ],
  },
  {
    title: 'AI Studio',
    icon: Bot,
    features: [
      'AI-чат с поддержкой нескольких моделей',
      'AI-действия: суммаризация, задачи, перевод, черновик ответа',
      'Генерация изображений',
      'Артефакты: документы, презентации, таблицы',
      'Загрузка и анализ файлов',
      'Локальное зашифрованное хранилище (vault)',
      'AI-память с управлением',
      'Архив AI-сессий',
      'Настройки приватности AI',
      'Онбординг-визард AI',
    ],
  },
  {
    title: 'Уведомления',
    icon: Bell,
    features: [
      'Звуки уведомлений (настраиваемые)',
      'Push-подписки (Web Push readiness)',
      'VoIP push для iOS (CallKit)',
      'Настройки звуков и вибрации',
    ],
  },
  {
    title: 'Оформление',
    icon: Palette,
    features: [
      'Тёмная / светлая тема',
      'Обои чатов (wallpaper)',
      'Настройка внешнего вида',
      'Режим энергосбережения',
      'Mask-режим (анонимность)',
    ],
  },
  {
    title: 'Безопасность',
    icon: Shield,
    features: [
      'RLS-политики на всех таблицах',
      'Rate limiting: 30 сообщений/мин (триггер БД)',
      'Rate limiting Edge Functions (по IP)',
      'Валидация токенов авторизации',
      'Защита от SQL-инъекций в поиске',
      'Security definer функции',
      'HTTPS enforcement',
    ],
  },
  {
    title: 'Администрирование',
    icon: BarChart3,
    features: [
      'Дашборд аналитики (пользователи, сообщения, звонки)',
      'Графики за 30 дней (recharts)',
      'Управление пользователями (роли, бан)',
      'Система жалоб (reports)',
      'Блокировка пользователей',
      'CSV-экспорт статистики',
      'Единственный админ: Vats (Userone)',
    ],
  },
  {
    title: 'Обнаружение и контакты',
    icon: Search,
    features: [
      'Поиск пользователей по имени и username',
      'RPC search_users_public с защитой',
      'Инвайт-система (QR-код, ссылка)',
      'Никнеймы для контактов',
    ],
  },
  {
    title: 'UX и производительность',
    icon: Zap,
    features: [
      'Адаптивный дизайн (mobile-first)',
      'Pull-to-refresh в списке чатов',
      'Оптимистичная отправка сообщений',
      'Realtime-подписки (chats, messages, typing, calls)',
      'Жесты свайпа для действий',
      'Empty-state компоненты',
      'Обработка ошибок с toast-уведомлениями',
      'PWA readiness (vite-plugin-pwa)',
      'Capacitor для нативных приложений (iOS/Android)',
    ],
  },
  {
    title: 'Отправка сообщений наружу',
    icon: Globe,
    features: [
      'Email-релей через Edge Function (Resend)',
      'Outbound messages: email, SMS, voice (подготовлено)',
      'Маскированные номера для звонков',
      'Подтверждение перед отправкой',
    ],
  },
];

function generateText(): string {
  const lines: string[] = ['MASK MESSENGER — ОПИСАНИЕ ФУНКЦИОНАЛА', '='.repeat(50), ''];
  featureSections.forEach((s) => {
    lines.push(s.title.toUpperCase());
    lines.push('-'.repeat(s.title.length));
    s.features.forEach((f) => lines.push(`  • ${f}`));
    lines.push('');
  });
  lines.push(`Всего функций: ${featureSections.reduce((a, s) => a + s.features.length, 0)}`);
  return lines.join('\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateHTML(): string {
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Mask — Функционал</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#222}
h1{text-align:center}section{margin:24px 0;border:1px solid #ddd;border-radius:12px;overflow:hidden}
.sh{background:#f5f5f5;padding:12px 16px;font-weight:600;border-bottom:1px solid #ddd}
ul{padding:8px 16px 12px 32px;margin:0}li{margin:4px 0;font-size:14px}
.footer{text-align:center;color:#888;font-size:12px;margin-top:32px}</style></head><body>
<h1>Mask Messenger — Функционал</h1>`;
  featureSections.forEach((s) => {
    html += `<section><div class="sh">${s.title} (${s.features.length})</div><ul>`;
    s.features.forEach((f) => { html += `<li>${f}</li>`; });
    html += `</ul></section>`;
  });
  html += `<p class="footer">Всего: ${featureSections.reduce((a, s) => a + s.features.length, 0)} функций</p></body></html>`;
  return html;
}

export const FeatureDescriptionDialog = ({ isOpen, onClose }: FeatureDescriptionDialogProps) => {
  if (!isOpen) return null;

  const handleExportTxt = () => downloadFile(generateText(), 'mask-features.txt', 'text/plain;charset=utf-8');
  const handleExportPdf = () => {
    // Use print-to-PDF via a new window with styled HTML
    const html = generateHTML();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 300);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background animate-slide-in-right lg:relative lg:animate-none">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Функционал Mask</h1>
          <p className="text-xs text-muted-foreground">Полное описание возможностей платформы</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="w-4 h-4" />
              Экспорт
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPdf}>
              <FileText className="w-4 h-4 mr-2" />
              Сохранить как PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportTxt}>
              <FileText className="w-4 h-4 mr-2" />
              Сохранить как TXT
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="h-[calc(100%-65px)]">
        <div className="p-4 space-y-6">
          {featureSections.map((section) => (
            <div key={section.title} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-muted/30 border-b border-border">
                <section.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="font-semibold text-sm">{section.title}</h2>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {section.features.length}
                </span>
              </div>
              <ul className="p-3 space-y-1.5">
                {section.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="text-primary mt-1 flex-shrink-0">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              Mask Messenger v1.0.0 • {featureSections.reduce((acc, s) => acc + s.features.length, 0)} функций
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
import { User, Chat, Message } from '@/types/chat';

export const currentUser: User = {
  id: 'user-1',
  name: 'Вы',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  status: 'online',
};

export const mockUsers: User[] = [
  {
    id: 'user-2',
    name: 'Анна Петрова',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anna',
    status: 'online',
  },
  {
    id: 'user-3',
    name: 'Михаил Иванов',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mikhail',
    status: 'offline',
    lastSeen: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: 'user-4',
    name: 'Елена Сидорова',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elena',
    status: 'online',
  },
  {
    id: 'user-5',
    name: 'Дмитрий Козлов',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dmitry',
    status: 'away',
    lastSeen: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: 'user-6',
    name: 'Ольга Новикова',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=olga',
    status: 'online',
  },
];

const createMessages = (userId: string): Message[] => {
  const messages: Message[] = [
    {
      id: `msg-${userId}-1`,
      senderId: userId,
      content: 'Привет! Как дела?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      type: 'text',
      isRead: true,
    },
    {
      id: `msg-${userId}-2`,
      senderId: 'user-1',
      content: 'Привет! Всё отлично, спасибо! А у тебя?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
      type: 'text',
      isRead: true,
    },
    {
      id: `msg-${userId}-3`,
      senderId: userId,
      content: 'Тоже хорошо! Хотел обсудить наш проект.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      type: 'text',
      isRead: true,
    },
    {
      id: `msg-${userId}-4`,
      senderId: 'user-1',
      content: 'Конечно, давай! Я как раз закончил последние правки.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      type: 'text',
      isRead: true,
    },
    {
      id: `msg-${userId}-5`,
      senderId: userId,
      content: 'Отлично! Можем созвониться вечером?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      type: 'text',
      isRead: false,
    },
  ];
  return messages;
};

export const mockChats: Chat[] = mockUsers.map((user, index) => ({
  id: `chat-${user.id}`,
  participants: [currentUser, user],
  messages: createMessages(user.id),
  lastMessage: {
    id: `msg-${user.id}-5`,
    senderId: user.id,
    content: index === 0 ? 'Отлично! Можем созвониться вечером?' : 
             index === 1 ? 'Увидимся завтра!' :
             index === 2 ? 'Фото отправила 📷' :
             index === 3 ? 'Спасибо за помощь!' :
             'Хорошего дня!',
    timestamp: new Date(Date.now() - 1000 * 60 * (index + 1) * 5),
    type: 'text',
    isRead: index > 1,
  },
  unreadCount: index < 2 ? index + 1 : 0,
  isGroup: false,
}));

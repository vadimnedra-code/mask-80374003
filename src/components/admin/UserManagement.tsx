import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Ban, 
  UserCheck,
  MoreVertical,
  Crown,
  User,
  MessageSquare
} from 'lucide-react';
import { Avatar } from '@/components/messenger/Avatar';
import { AdminUser, useAdminUsers } from '@/hooks/useAdminUsers';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const UserManagement = () => {
  const { users, loading, setUserRole, blockUser, refetch } = useAdminUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'admins' | 'banned'>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'admins') {
      return matchesSearch && user.roles?.includes('admin');
    }
    if (filter === 'banned') {
      return matchesSearch && user.status === 'banned';
    }
    return matchesSearch;
  });

  const getRoleBadge = (user: AdminUser) => {
    if (user.roles?.includes('admin')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <Crown className="w-3 h-3" />
          Админ
        </span>
      );
    }
    if (user.roles?.includes('moderator')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
          <ShieldCheck className="w-3 h-3" />
          Модератор
        </span>
      );
    }
    return null;
  };

  const getStatusBadge = (user: AdminUser) => {
    if (user.status === 'banned') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
          <Ban className="w-3 h-3" />
          Заблокирован
        </span>
      );
    }
    if (user.status === 'online') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          Онлайн
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-lg font-semibold text-amber-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Управление пользователями ({users.length})
        </h2>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-amber-500/20 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'admins', 'banned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === f
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-black/20 text-muted-foreground hover:bg-black/40 border border-transparent"
            )}
          >
            {f === 'all' && 'Все'}
            {f === 'admins' && 'Админы'}
            {f === 'banned' && 'Заблокированные'}
          </button>
        ))}
      </div>

      {/* User List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.02 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all",
                user.status === 'banned'
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-black/20 border-amber-500/10 hover:bg-black/30"
              )}
            >
              <Avatar
                src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_id}`}
                alt={user.display_name}
                size="md"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{user.display_name}</span>
                  {getRoleBadge(user)}
                  {getStatusBadge(user)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {user.username && (
                    <span>@{user.username}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {user.message_count}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(user.created_at), { 
                      addSuffix: true, 
                      locale: ru 
                    })}
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-lg hover:bg-amber-500/10 transition-colors">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => setUserRole(user.user_id, 'admin', user.roles?.includes('admin') ? 'remove' : 'add')}
                    className="gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    {user.roles?.includes('admin') ? 'Убрать админа' : 'Сделать админом'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setUserRole(user.user_id, 'moderator', user.roles?.includes('moderator') ? 'remove' : 'add')}
                    className="gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {user.roles?.includes('moderator') ? 'Убрать модератора' : 'Сделать модератором'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => blockUser(user.user_id, user.status !== 'banned')}
                    className={cn(
                      "gap-2",
                      user.status !== 'banned' ? "text-red-400 focus:text-red-400" : "text-green-400 focus:text-green-400"
                    )}
                  >
                    {user.status === 'banned' ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Разблокировать
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4" />
                        Заблокировать
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Пользователи не найдены</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

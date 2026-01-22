import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  Phone, 
  TrendingUp,
  UserPlus,
  Activity,
  Shield,
  ArrowLeft,
  RefreshCw,
  MessageCircle,
  UsersRound
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'amber'
}: { 
  title: string; 
  value: number | string; 
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  color?: 'amber' | 'green' | 'blue' | 'purple';
}) => {
  const colorClasses = {
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
    green: 'from-green-500/20 to-green-600/10 border-green-500/20 text-green-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/20 text-purple-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative p-5 rounded-2xl border bg-gradient-to-br overflow-hidden",
        colorClasses[color]
      )}
    >
      <div className="absolute top-3 right-3 opacity-20">
        <Icon className="w-12 h-12" />
      </div>
      <div className="relative z-10">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-xs font-medium",
            trend >= 0 ? "text-green-400" : "text-red-400"
          )}>
            <TrendingUp className={cn("w-3 h-3", trend < 0 && "rotate-180")} />
            <span>{trend >= 0 ? '+' : ''}{trend}% за неделю</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { analytics, loading, error, isAdmin, refetch } = useAdminAnalytics();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-muted-foreground">Загрузка панели администратора...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Доступ запрещён</h1>
          <p className="text-muted-foreground mb-6">
            У вас нет прав администратора для просмотра этой страницы
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
          >
            Вернуться в мессенджер
          </button>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-amber-500 text-black rounded-lg font-medium"
        >
          Повторить
        </button>
      </div>
    );
  }

  // Prepare chart data
  const messagesChartData = analytics?.messages_by_day?.map(item => ({
    date: new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
    messages: item.count,
  })) || [];

  const usersChartData = analytics?.users_by_day?.map(item => ({
    date: new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
    users: item.count,
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-amber-500/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-amber-500/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-amber-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold">
                <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                  Панель администратора
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">МАСК Messenger</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-20">
        {/* Live indicator */}
        <div className="flex items-center gap-2 mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs text-muted-foreground">Данные обновляются в реальном времени</span>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Всего пользователей"
            value={analytics?.total_users || 0}
            subtitle={`+${analytics?.new_users_week || 0} за неделю`}
            icon={Users}
            color="amber"
          />
          <StatCard
            title="Сейчас онлайн"
            value={analytics?.online_users || 0}
            icon={Activity}
            color="green"
          />
          <StatCard
            title="Всего сообщений"
            value={analytics?.total_messages?.toLocaleString() || 0}
            subtitle={`${analytics?.messages_today || 0} сегодня`}
            icon={MessageSquare}
            color="blue"
          />
          <StatCard
            title="Активные звонки"
            value={analytics?.active_calls || 0}
            icon={Phone}
            color="purple"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Всего чатов"
            value={analytics?.total_chats || 0}
            icon={MessageCircle}
            color="blue"
          />
          <StatCard
            title="Групповые чаты"
            value={analytics?.group_chats || 0}
            icon={UsersRound}
            color="purple"
          />
          <StatCard
            title="Новых сегодня"
            value={analytics?.new_users_today || 0}
            icon={UserPlus}
            color="green"
          />
          <StatCard
            title="Сообщений за неделю"
            value={analytics?.messages_week?.toLocaleString() || 0}
            icon={TrendingUp}
            color="amber"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Messages Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 rounded-2xl border border-amber-500/10 bg-gradient-to-br from-amber-500/5 to-transparent"
          >
            <h3 className="text-lg font-semibold mb-4 text-amber-100">
              Сообщения за 30 дней
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={messagesChartData}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666" 
                    tick={{ fill: '#888', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#f59e0b' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMessages)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Users Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-5 rounded-2xl border border-green-500/10 bg-gradient-to-br from-green-500/5 to-transparent"
          >
            <h3 className="text-lg font-semibold mb-4 text-green-100">
              Регистрации за 30 дней
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usersChartData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666" 
                    tick={{ fill: '#888', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#22c55e' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Admin;

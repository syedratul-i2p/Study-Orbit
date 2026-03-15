import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/languageContext";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Flame, Target, Clock, TrendingUp, Activity, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import type { ProgressLog, FocusSession, Subject } from "@shared/schema";
import { format, subDays } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { SummaryPanel } from "@/components/summary-panel";
import { EmptyState } from "@/components/empty-state";

export default function ProgressPage() {
  const { t } = useLanguage();

  const { data: progress = [], isLoading: progressLoading } = useQuery<ProgressLog[]>({
    queryKey: ["/api/progress"],
  });

  const { data: sessions = [] } = useQuery<FocusSession[]>({
    queryKey: ["/api/focus-sessions"],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const today = new Date().toISOString().split("T")[0];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const log = progress.find((p) => p.date === dateStr);
    return {
      date: format(date, "EEE"),
      minutes: log?.totalMinutes || 0,
    };
  });

  const totalMinutesWeek = last7Days.reduce((sum, d) => sum + d.minutes, 0);
  const avgMinutesDay = Math.round(totalMinutesWeek / 7);
  const totalSessions = sessions.length;

  const subjectDistribution = subjects.map((s) => {
    const subjectSessions = sessions.filter((sess) => sess.subjectId === s.id);
    const totalMin = subjectSessions.reduce((sum, sess) => sum + sess.duration, 0);
    return { name: s.name, value: totalMin, color: s.color || "#4F46E5" };
  }).filter((s) => s.value > 0);

  const streak = (() => {
    let count = 0;
    const sortedDates = progress
      .map((p) => p.date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      if (sortedDates.includes(ds)) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  })();

  const completionRate = sessions.length > 0
    ? Math.round((sessions.filter((s) => s.rating && s.rating >= 3).length / sessions.length) * 100)
    : 0;

  const focusScore = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.rating || 3), 0) / sessions.length * 20)
    : 0;

  const COLORS = ["#4F46E5", "#0D9488", "#D97706", "#DC2626", "#7C3AED", "#2563EB"];

  const statCards = [
    { icon: Flame, label: t.progress.currentStreak, value: `${streak}`, suffix: t.progress.days, gradient: "from-orange-500 to-red-500" },
    { icon: Clock, label: t.progress.weeklyHours, value: `${Math.round(totalMinutesWeek / 60 * 10) / 10}`, suffix: "h", gradient: "from-blue-500 to-indigo-500" },
    { icon: Target, label: t.progress.completionRate, value: `${completionRate}`, suffix: "%", gradient: "from-emerald-500 to-teal-500" },
    { icon: TrendingUp, label: t.progress.focusScore, value: `${focusScore}`, suffix: "/100", gradient: "from-purple-500 to-pink-500" },
  ];

  return (
    <div className="app-page space-y-6">
      <PageHeader
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            {t.progress.analytics}
          </>
        }
        icon={<Activity className="h-6 w-6 text-primary" />}
        title={t.progress.title}
        description={`${totalSessions} ${t.progress.totalSessions.toLowerCase()}`}
      >
        <div className="flex flex-wrap gap-3">
          <SummaryPanel label={t.progress.thisWeek} value={`${Math.round(totalMinutesWeek / 60 * 10) / 10}h`} />
          <SummaryPanel label={t.progress.dailyAverage} value={`${avgMinutesDay}m`} />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="app-surface p-4 relative overflow-visible hover-elevate">
              <div className="flex items-start justify-between gap-1">
                <div>
                  <p className="text-xs text-muted-foreground font-medium leading-tight">{stat.label}</p>
                  <motion.p
                    className="text-3xl font-bold mt-2 tabular-nums tracking-tight"
                    data-testid={`text-progress-stat-${i}`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.08 + 0.2, type: "spring", stiffness: 200 }}
                  >
                    {stat.value}
                    <span className="text-sm font-normal text-muted-foreground ml-0.5">{stat.suffix}</span>
                  </motion.p>
                </div>
                <div className={`w-10 h-10 rounded-md bg-gradient-to-br ${stat.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="app-surface overflow-visible">
            <div className="p-4 sm:p-5 pb-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                </div>
                <h2 className="font-semibold">{t.progress.dailyMinutes}</h2>
              </div>
            </div>
            <div className="px-2 pb-4">
              {progressLoading ? (
                <Skeleton className="h-[200px] mx-3 rounded-md" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={last7Days}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="app-surface overflow-visible">
            <div className="p-4 sm:p-5 pb-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <h2 className="font-semibold">{t.progress.subjectDistribution}</h2>
              </div>
            </div>
            <div className="px-2 pb-4">
              {subjectDistribution.length === 0 ? (
                <EmptyState
                  compact
                  className="h-[200px] border-0 bg-transparent text-sm shadow-none"
                  icon={<Target className="w-8 h-8 text-primary/50" />}
                  title={t.progress.noSubjectData}
                />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={subjectDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}m`}
                      labelLine={false}
                    >
                      {subjectDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card className="app-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-md bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <h2 className="font-semibold">{t.progress.totalSessions}: {totalSessions}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: avgMinutesDay, label: t.progress.averageMinutesPerDay, gradient: "from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20" },
              { value: totalSessions, label: t.progress.totalSessions, gradient: "from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20" },
              { value: `${Math.round(totalMinutesWeek / 60 * 10) / 10}h`, label: t.progress.thisWeek, gradient: "from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20" },
              { value: focusScore, label: t.progress.focusScore, gradient: "from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 + 0.5 }}
                className={`text-center p-4 rounded-md bg-gradient-to-br ${item.gradient}`}
              >
                <p className="text-2xl font-bold tabular-nums">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

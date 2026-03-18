import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/languageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Timer,
  Brain,
  Calendar,
  Flame,
  Clock,
  Target,
  BookOpen,
  ArrowRight,
  StickyNote,
  Plus,
  Sparkles,
  Check,
  CheckCircle2,
  Circle,
  AlertCircle,
  MinusCircle,
  MessageSquareHeart,
  Lightbulb,
  Bug,
  MessageCircle,
  Star,
  Send,
  Loader2,
} from "lucide-react";
import type { PlannerItem, FocusSession, ProgressLog } from "@shared/schema";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const NOTE_MAX_LENGTH = 500;

export default function DashboardPage() {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [quickNote, setQuickNote] = useState(user?.privateNote || "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"suggestion" | "bug" | "general">("suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { data: todayPlans = [], isLoading: plansLoading } = useQuery<PlannerItem[]>({
    queryKey: ["/api/planner", { from: today, to: today }],
    queryFn: async () => {
      const res = await fetch(`/api/planner?from=${today}&to=${today}`);
      if (!res.ok) throw new Error(t.common.error);
      return res.json();
    },
  });

  const { data: sessions = [] } = useQuery<FocusSession[]>({
    queryKey: ["/api/focus-sessions"],
  });

  const { data: progress = [] } = useQuery<ProgressLog[]>({
    queryKey: ["/api/progress"],
  });

  const todayProgress = progress.find((p) => p.date === today);
  const todaySessions = sessions.filter(
    (s) => s.completedAt && new Date(s.completedAt).toISOString().split("T")[0] === today,
  );

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

  const saveNote = useMutation({
    mutationFn: () => updateProfile({ privateNote: quickNote } as any),
    onSuccess: () => {
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    },
  });

  const { toast } = useToast();
  const submitFeedback = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/feedback", {
        type: feedbackType,
        message: feedbackMessage.trim(),
        rating: feedbackRating || null,
      }),
    onSuccess: () => {
      setFeedbackSubmitted(true);
      setFeedbackMessage("");
      setFeedbackRating(0);
      setTimeout(() => setFeedbackSubmitted(false), 4000);
    },
    onError: () => {
      toast({ title: t.common.error, variant: "destructive" });
    },
  });

  const completedPlans = todayPlans.filter((p) => p.status === "completed").length;
  const totalPlans = todayPlans.length;

  const statCards = [
    {
      icon: Flame,
      label: t.dashboard.streak,
      value: streak,
      suffix: t.progress.days,
      gradient: "from-orange-500 to-red-500",
      accent: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
    },
    {
      icon: Clock,
      label: t.dashboard.minutesToday,
      value: todayProgress?.totalMinutes || 0,
      suffix: t.common.minutesShort,
      gradient: "from-blue-500 to-indigo-500",
      accent: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    },
    {
      icon: Target,
      label: t.dashboard.sessionsToday,
      value: todaySessions.length,
      suffix: "",
      gradient: "from-emerald-500 to-teal-500",
      accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    },
    {
      icon: BookOpen,
      label: t.progress.totalSessions,
      value: sessions.length,
      suffix: "",
      gradient: "from-purple-500 to-pink-500",
      accent: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "partial":
        return <MinusCircle className="h-4 w-4 text-amber-500" />;
      case "missed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground/40" />;
    }
  };

  return (
    <div className="app-page space-y-6">
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="app-surface overflow-hidden"
      >
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-8">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-40 rounded-[1.75rem] bg-gradient-to-r from-primary/12 via-primary/6 to-transparent" />
            <div className="relative space-y-4">
              <div className="app-kicker">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t.app.name}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" data-testid="text-welcome">
                  {t.dashboard.welcome}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {t.app.tagline}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button className="rounded-2xl px-5" onClick={() => navigate("/planner")} data-testid="button-view-planner">
                  <Plus className="mr-2 h-4 w-4" />
                  {t.planner.addTask}
                </Button>
                <Button variant="outline" className="rounded-2xl px-5" onClick={() => navigate("/focus")} data-testid="card-start-focus">
                  <Timer className="mr-2 h-4 w-4" />
                  {t.dashboard.startFocus}
                </Button>
                <Button variant="outline" className="rounded-2xl px-5" onClick={() => navigate("/ai")} data-testid="card-ask-ai">
                  <Brain className="mr-2 h-4 w-4" />
                  {t.dashboard.askAI}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t.dashboard.todaysPlan}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{completedPlans}<span className="ml-1 text-base font-normal text-muted-foreground">/ {totalPlans || 0}</span></p>
              <p className="mt-2 text-sm text-muted-foreground">
                {totalPlans > 0
                  ? t.dashboard.completedToday.replace("{count}", String(completedPlans))
                  : t.dashboard.noPlansToday}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t.dashboard.focusPulse}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{todayProgress?.totalMinutes || 0}<span className="ml-1 text-base font-normal text-muted-foreground">{t.common.minutesShort}</span></p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.dashboard.sessionsLoggedToday.replace("{count}", String(todaySessions.length))}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" initial="hidden" animate="visible" variants={stagger}>
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={fadeUp}>
            <Card className="app-surface h-full p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{stat.label}</p>
                  <p className="mt-4 text-3xl font-semibold tracking-tight" data-testid={`text-stat-${i}`}>
                    {stat.value}
                    {stat.suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{stat.suffix}</span>}
                  </p>
                </div>
                <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${stat.accent}`}>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg shadow-black/10`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="space-y-6">
          <motion.section initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.15 }}>
            <Card className="app-surface overflow-hidden">
              <div className="app-section-header border-b border-border/60 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{t.dashboard.todaysPlan}</h2>
                      <p className="text-sm text-muted-foreground">
                        {totalPlans > 0
                          ? t.dashboard.scheduledTasks
                              .replace("{completed}", String(completedPlans))
                              .replace("{total}", String(totalPlans))
                          : t.dashboard.scheduleToday}
                      </p>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => navigate("/planner")} data-testid="button-view-planner-secondary">
                  <Plus className="mr-2 h-4 w-4" />
                  {t.planner.addTask}
                </Button>
              </div>
              <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                {plansLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full rounded-2xl" />
                    <Skeleton className="h-16 w-full rounded-2xl" />
                    <Skeleton className="h-16 w-full rounded-2xl" />
                  </div>
                ) : todayPlans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-muted/70">
                      <Calendar className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{t.dashboard.noPlansToday}</p>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{t.dashboard.scheduleToday}</p>
                    <Button size="sm" variant="outline" className="mt-5 rounded-2xl" onClick={() => navigate("/planner")} data-testid="button-add-plan-empty">
                      <Plus className="mr-2 h-4 w-4" />
                      {t.planner.addTask}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayPlans.slice(0, 5).map((plan) => (
                      <div
                        key={plan.id}
                        className={`rounded-[1.35rem] border px-4 py-3.5 transition-colors ${plan.status === "completed" ? "border-emerald-500/15 bg-emerald-500/8" : "border-border/70 bg-background/70"}`}
                        data-testid={`planner-item-${plan.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex-shrink-0">{getStatusIcon(plan.status || "pending")}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className={`text-sm font-semibold ${plan.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>{plan.title}</p>
                                {plan.startTime && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {plan.startTime}{plan.endTime && ` - ${plan.endTime}`}
                                  </p>
                                )}
                              </div>
                              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] capitalize">{plan.type}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {todayPlans.length > 5 && (
                      <Button size="sm" variant="ghost" className="w-full rounded-2xl text-xs text-muted-foreground" onClick={() => navigate("/planner")} data-testid="button-view-all-plans">
                        {t.dashboard.morePlans.replace("{count}", String(todayPlans.length - 5))}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </motion.section>

          <motion.section className="grid gap-4 md:grid-cols-2" initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <Card className="app-surface group cursor-pointer overflow-hidden p-5" onClick={() => navigate("/focus")} data-testid="card-start-focus-surface">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/15">
                    <Timer className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">{t.dashboard.startFocus}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t.focus.pomodoro} / {t.focus.deepWork}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Card className="app-surface group cursor-pointer overflow-hidden p-5" onClick={() => navigate("/ai")} data-testid="card-ask-ai-surface">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/15">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">{t.dashboard.askAI}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t.dashboard.bilingualSupport}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Card>
            </motion.div>
          </motion.section>
        </div>

        <motion.aside className="space-y-6" initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.2 }}>
          <Card className="app-surface overflow-hidden">
            <div className="app-section-header border-b border-border/60 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-300">
                  <StickyNote className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{t.dashboard.quickNote}</h3>
                  <p className="text-sm text-muted-foreground">{t.dashboard.quickNoteDescription}</p>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
              <Textarea
                value={quickNote}
                onChange={(e) => {
                  if (e.target.value.length <= NOTE_MAX_LENGTH) {
                    setQuickNote(e.target.value);
                  }
                }}
                placeholder={t.dashboard.quickNotePlaceholder}
                className="min-h-[150px] resize-none rounded-[1.35rem] border-border/70 bg-background/70 text-sm shadow-sm focus:border-primary/30"
                data-testid="textarea-quick-note"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground/70">{quickNote.length}/{NOTE_MAX_LENGTH}</span>
                <AnimatePresence mode="wait">
                  {noteSaved ? (
                    <motion.div key="saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-1 text-emerald-500">
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">{t.dashboard.saved}</span>
                    </motion.div>
                  ) : (
                    <motion.div key="save-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => saveNote.mutate()} disabled={saveNote.isPending} data-testid="button-save-note">
                        {saveNote.isPending ? (
                          <span className="flex items-center gap-1">
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                              className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent"
                            />
                            {t.dashboard.saving}
                          </span>
                        ) : (
                          t.common.save
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Card>

          <Card className="app-surface overflow-hidden">
            <div className="app-section-header border-b border-border/60 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-500/12 text-pink-600 dark:text-pink-300">
                  <MessageSquareHeart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{t.feedback.title}</h3>
                  <p className="text-sm text-muted-foreground">{t.feedback.subtitle}</p>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
              <AnimatePresence mode="wait">
                {feedbackSubmitted ? (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center rounded-[1.5rem] border border-emerald-500/15 bg-emerald-500/8 px-6 py-10 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500/18">
                      <Check className="h-7 w-7 text-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold">{t.feedback.successMessage}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.feedback.thankYou}</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { key: "suggestion" as const, icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
                        { key: "bug" as const, icon: Bug, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
                        { key: "general" as const, icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
                      ]).map((item) => (
                        <Button
                          key={item.key}
                          variant="outline"
                          size="sm"
                          className={`h-10 rounded-2xl text-[11px] font-semibold transition-all ${feedbackType === item.key ? `${item.bg} ${item.color}` : "text-muted-foreground"}`}
                          onClick={() => setFeedbackType(item.key)}
                          data-testid={`button-feedback-type-${item.key}`}
                        >
                          <item.icon className="mr-1.5 h-3.5 w-3.5" />
                          {item.key === "suggestion" ? t.feedback.typeSuggestion : item.key === "bug" ? t.feedback.typeBug : t.feedback.typeGeneral}
                        </Button>
                      ))}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t.feedback.ratingLabel}</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            className="p-0.5 transition-transform hover:scale-110"
                            onMouseEnter={() => setFeedbackHoverRating(star)}
                            onMouseLeave={() => setFeedbackHoverRating(0)}
                            onClick={() => setFeedbackRating(star === feedbackRating ? 0 : star)}
                            data-testid={`button-feedback-star-${star}`}
                          >
                            <Star className={`h-5 w-5 transition-colors ${star <= (feedbackHoverRating || feedbackRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      value={feedbackMessage}
                      onChange={(e) => {
                        if (e.target.value.length <= NOTE_MAX_LENGTH) {
                          setFeedbackMessage(e.target.value);
                        }
                      }}
                      placeholder={t.feedback.messagePlaceholder}
                      className="min-h-[110px] resize-none rounded-[1.35rem] border-border/70 bg-background/70 text-sm shadow-sm focus:border-primary/30"
                      data-testid="textarea-feedback-message"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground/70">{feedbackMessage.length}/{NOTE_MAX_LENGTH}</span>
                      <Button size="sm" className="rounded-2xl" onClick={() => submitFeedback.mutate()} disabled={!feedbackMessage.trim() || submitFeedback.isPending} data-testid="button-submit-feedback">
                        {submitFeedback.isPending ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            {t.feedback.submitting}
                          </>
                        ) : (
                          <>
                            <Send className="mr-1.5 h-3.5 w-3.5" />
                            {t.feedback.submitButton}
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </motion.aside>
      </div>
    </div>
  );
}

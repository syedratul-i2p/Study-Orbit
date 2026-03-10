import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/languageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
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
      if (!res.ok) throw new Error("Failed");
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
    (s) => s.completedAt && new Date(s.completedAt).toISOString().split("T")[0] === today
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
      toast({
        title: t.common.error,
        variant: "destructive",
      });
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
      bgTint: "bg-orange-500/5 dark:bg-orange-500/10",
    },
    {
      icon: Clock,
      label: t.dashboard.minutesToday,
      value: todayProgress?.totalMinutes || 0,
      suffix: "min",
      gradient: "from-blue-500 to-indigo-500",
      bgTint: "bg-blue-500/5 dark:bg-blue-500/10",
    },
    {
      icon: Target,
      label: t.dashboard.sessionsToday,
      value: todaySessions.length,
      suffix: "",
      gradient: "from-emerald-500 to-teal-500",
      bgTint: "bg-emerald-500/5 dark:bg-emerald-500/10",
    },
    {
      icon: BookOpen,
      label: t.progress.totalSessions,
      value: sessions.length,
      suffix: "",
      gradient: "from-purple-500 to-pink-500",
      bgTint: "bg-purple-500/5 dark:bg-purple-500/10",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "partial":
        return <MinusCircle className="w-4 h-4 text-amber-500" />;
      case "missed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground/40" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative overflow-visible rounded-md p-5 sm:p-6"
      >
        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/8 via-primary/4 to-transparent dark:from-primary/12 dark:via-primary/6 dark:to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary/70" />
            <span className="text-xs font-medium text-primary/70 uppercase tracking-wider">{t.app.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-welcome">
            {t.dashboard.welcome}, {user?.fullName?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t.app.tagline}</p>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={fadeUp}>
            <Card className={`p-4 sm:p-5 ${stat.bgTint} border-transparent hover-elevate transition-all duration-200`}>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">{stat.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-2 tracking-tight" data-testid={`text-stat-${i}`}>
                    {stat.value}
                    {stat.suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{stat.suffix}</span>}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-md bg-gradient-to-br ${stat.gradient} flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.15 }}>
            <Card className="overflow-visible">
              <div className="p-4 sm:p-5 pb-0">
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <h2 className="font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    {t.dashboard.todaysPlan}
                    {totalPlans > 0 && (
                      <span className="text-xs text-muted-foreground font-normal ml-1">
                        {completedPlans}/{totalPlans}
                      </span>
                    )}
                  </h2>
                  <Button size="sm" variant="ghost" onClick={() => navigate("/planner")} data-testid="button-view-planner">
                    <Plus className="w-4 h-4 mr-1" /> {t.planner.addTask}
                  </Button>
                </div>
              </div>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                {plansLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full rounded-md" />
                    <Skeleton className="h-14 w-full rounded-md" />
                    <Skeleton className="h-14 w-full rounded-md" />
                  </div>
                ) : todayPlans.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-md bg-gradient-to-br from-muted/60 to-muted/30 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{t.dashboard.noPlansToday}</p>
                    <p className="text-xs text-muted-foreground/60 mb-4">Plan your day to stay on track</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/planner")}
                      data-testid="button-add-plan-empty"
                    >
                      <Plus className="w-4 h-4 mr-1" /> {t.planner.addTask}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {todayPlans.slice(0, 5).map((plan) => (
                      <div
                        key={plan.id}
                        className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                          plan.status === "completed"
                            ? "bg-emerald-500/5 dark:bg-emerald-500/8"
                            : "bg-muted/40 dark:bg-muted/20"
                        }`}
                        data-testid={`planner-item-${plan.id}`}
                      >
                        <div className="flex-shrink-0">
                          {getStatusIcon(plan.status || "pending")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            plan.status === "completed" ? "line-through text-muted-foreground" : ""
                          }`}>{plan.title}</p>
                          {plan.startTime && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              {plan.startTime}{plan.endTime && ` - ${plan.endTime}`}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize flex-shrink-0">
                          {plan.type}
                        </Badge>
                      </div>
                    ))}
                    {todayPlans.length > 5 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full mt-1 text-xs text-muted-foreground"
                        onClick={() => navigate("/planner")}
                        data-testid="button-view-all-plans"
                      >
                        +{todayPlans.length - 5} more
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <Card
                className="p-4 sm:p-5 cursor-pointer hover-elevate group relative overflow-visible"
                onClick={() => navigate("/focus")}
                data-testid="card-start-focus"
              >
                <div className="absolute inset-0 rounded-md bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/8 dark:to-teal-500/8 pointer-events-none" />
                <div className="relative flex items-center gap-3">
                  <div className="w-11 h-11 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                    <Timer className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{t.dashboard.startFocus}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.focus.pomodoro} / {t.focus.deepWork}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </Card>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Card
                className="p-4 sm:p-5 cursor-pointer hover-elevate group relative overflow-visible"
                onClick={() => navigate("/ai")}
                data-testid="card-ask-ai"
              >
                <div className="absolute inset-0 rounded-md bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/8 dark:to-purple-500/8 pointer-events-none" />
                <div className="relative flex items-center gap-3">
                  <div className="w-11 h-11 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{t.dashboard.askAI}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">English & বাংলা</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>

        <motion.div className="space-y-4" initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.2 }}>
          <Card className="overflow-visible">
            <div className="p-4 pb-3 border-b border-border/50">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                </div>
                {t.dashboard.quickNote}
              </h3>
            </div>
            <div className="p-4 pt-3">
              <Textarea
                value={quickNote}
                onChange={(e) => {
                  if (e.target.value.length <= NOTE_MAX_LENGTH) {
                    setQuickNote(e.target.value);
                  }
                }}
                placeholder={t.dashboard.quickNotePlaceholder}
                className="resize-none text-sm min-h-[120px] border-muted/60 focus:border-primary/30"
                data-testid="textarea-quick-note"
              />
              <div className="flex items-center justify-between gap-2 mt-2">
                <span className="text-xs text-muted-foreground/60">
                  {quickNote.length}/{NOTE_MAX_LENGTH}
                </span>
                <AnimatePresence mode="wait">
                  {noteSaved ? (
                    <motion.div
                      key="saved"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-1 text-emerald-500"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Saved</span>
                    </motion.div>
                  ) : (
                    <motion.div key="save-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => saveNote.mutate()}
                        disabled={saveNote.isPending}
                        data-testid="button-save-note"
                      >
                        {saveNote.isPending ? (
                          <span className="flex items-center gap-1">
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                              className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"
                            />
                            Saving...
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

          <Card className="overflow-visible">
            <div className="p-4 pb-3 border-b border-border/50">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-pink-500/15 to-rose-500/5 flex items-center justify-center">
                  <MessageSquareHeart className="w-3.5 h-3.5 text-pink-500" />
                </div>
                {t.feedback.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 pl-9">{t.feedback.subtitle}</p>
            </div>
            <div className="p-4 pt-3">
              <AnimatePresence mode="wait">
                {feedbackSubmitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-3">
                      <Check className="w-7 h-7 text-emerald-500" />
                    </div>
                    <p className="font-semibold text-sm">{t.feedback.successMessage}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.feedback.thankYou}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex gap-1.5">
                      {([
                        { key: "suggestion" as const, icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
                        { key: "bug" as const, icon: Bug, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
                        { key: "general" as const, icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
                      ]).map((item) => (
                        <Button
                          key={item.key}
                          variant="outline"
                          size="sm"
                          className={`flex-1 text-[11px] gap-1.5 rounded-lg h-8 transition-all ${
                            feedbackType === item.key
                              ? `${item.bg} border ${item.color}`
                              : "text-muted-foreground"
                          }`}
                          onClick={() => setFeedbackType(item.key)}
                          data-testid={`button-feedback-type-${item.key}`}
                        >
                          <item.icon className="w-3 h-3" />
                          {item.key === "suggestion" ? t.feedback.typeSuggestion :
                           item.key === "bug" ? t.feedback.typeBug : t.feedback.typeGeneral}
                        </Button>
                      ))}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">{t.feedback.ratingLabel}</p>
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
                            <Star
                              className={`w-5 h-5 transition-colors ${
                                star <= (feedbackHoverRating || feedbackRating)
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-muted-foreground/30"
                              }`}
                            />
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
                      className="resize-none text-sm min-h-[80px] border-muted/60 focus:border-primary/30"
                      data-testid="textarea-feedback-message"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground/60">
                        {feedbackMessage.length}/{NOTE_MAX_LENGTH}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => submitFeedback.mutate()}
                        disabled={!feedbackMessage.trim() || submitFeedback.isPending}
                        className="gap-1.5 rounded-lg"
                        data-testid="button-submit-feedback"
                      >
                        {submitFeedback.isPending ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {t.feedback.submitting}
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
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
        </motion.div>
      </div>
    </div>
  );
}

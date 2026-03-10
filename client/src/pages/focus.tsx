import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/languageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Timer, Clock, Zap, Star, Crosshair, BookOpen } from "lucide-react";
import type { Subject } from "@shared/schema";

const PRESETS = {
  pomodoro: { work: 25, break: 5 },
  deepWork: { work: 50, break: 10 },
  marathon: { work: 90, break: 15 },
};

export default function FocusPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [mode, setMode] = useState<"pomodoro" | "deepWork" | "marathon" | "custom">("pomodoro");
  const [customMinutes, setCustomMinutes] = useState(30);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(3);
  const [needsRevision, setNeedsRevision] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/focus-sessions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      setSessionComplete(false);
      setNotes("");
      setRating(3);
      setNeedsRevision(false);
      toast({ title: t.common.success, description: t.focus.sessionComplete });
    },
  });

  const getWorkMinutes = useCallback(() => {
    if (mode === "custom") return customMinutes;
    return PRESETS[mode as keyof typeof PRESETS]?.work || 25;
  }, [mode, customMinutes]);

  const getBreakMinutes = useCallback(() => {
    if (mode === "custom") return 5;
    return PRESETS[mode as keyof typeof PRESETS]?.break || 5;
  }, [mode]);

  useEffect(() => {
    if (!isRunning) return;
    setTotalTime(isBreak ? getBreakMinutes() * 60 : getWorkMinutes() * 60);
  }, [isRunning, isBreak, getWorkMinutes, getBreakMinutes]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (!isBreak) {
        setSessionComplete(true);
      } else {
        setIsBreak(false);
        setTimeLeft(getWorkMinutes() * 60);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, isBreak, getWorkMinutes]);

  const start = () => {
    if (timeLeft === 0) {
      setTimeLeft(isBreak ? getBreakMinutes() * 60 : getWorkMinutes() * 60);
    }
    setIsRunning(true);
  };

  const pause = () => setIsRunning(false);

  const reset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(getWorkMinutes() * 60);
  };

  const selectMode = (m: typeof mode) => {
    setMode(m);
    setIsRunning(false);
    setIsBreak(false);
    if (m === "custom") {
      setTimeLeft(customMinutes * 60);
    } else {
      setTimeLeft(PRESETS[m as keyof typeof PRESETS].work * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const circumference = 2 * Math.PI * 112;
  const dashOffset = circumference - (progress / 100) * circumference;

  const handleSaveSession = () => {
    saveMutation.mutate({
      duration: getWorkMinutes(),
      type: mode,
      notes: notes || undefined,
      rating,
      needsRevision,
      subjectId: subjectId ? parseInt(subjectId) : undefined,
    });
  };

  const modeOptions = [
    { key: "pomodoro" as const, label: t.focus.pomodoro, icon: Timer, desc: "25 / 5 min" },
    { key: "deepWork" as const, label: t.focus.deepWork, icon: Clock, desc: "50 / 10 min" },
    { key: "marathon" as const, label: "Marathon", icon: Zap, desc: "90 / 15 min" },
    { key: "custom" as const, label: t.focus.custom, icon: Star, desc: `${customMinutes} min` },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
          <Crosshair className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-focus-title">{t.focus.title}</h1>
          <p className="text-sm text-muted-foreground">
            {isBreak ? t.focus.breakTime : isRunning ? t.focus.focusNow : "Select a mode to begin"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {modeOptions.map((m) => {
          const isActive = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => selectMode(m.key)}
              className={`relative p-3.5 rounded-md text-left transition-all ${
                isActive
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "bg-muted/30 hover-elevate"
              }`}
              data-testid={`button-mode-${m.key}`}
            >
              <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-2 ${
                isActive
                  ? "bg-primary/15"
                  : "bg-muted/60"
              }`}>
                <m.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <p className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>{m.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
            </button>
          );
        })}
      </div>

      {mode === "custom" && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium whitespace-nowrap">{t.focus.minutes}:</Label>
            <Input
              type="number"
              min={1}
              max={180}
              value={customMinutes}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 30;
                setCustomMinutes(v);
                if (!isRunning) setTimeLeft(v * 60);
              }}
              className="w-24"
              data-testid="input-custom-minutes"
            />
          </div>
        </Card>
      )}

      <Card className="p-8 sm:p-10">
        <div className="flex flex-col items-center">
          <div className="relative w-60 h-60 sm:w-72 sm:h-72">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
              <circle
                cx="120"
                cy="120"
                r="112"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="3"
                opacity="0.5"
              />
              <circle
                cx="120"
                cy="120"
                r="112"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="3"
                strokeDasharray="4 8"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isBreak ? "#34d399" : "#8b5cf6"} />
                  <stop offset="50%" stopColor={isBreak ? "#10b981" : "#6366f1"} />
                  <stop offset="100%" stopColor={isBreak ? "#059669" : "#a855f7"} />
                </linearGradient>
                <filter id="glowFilter">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <motion.circle
                cx="120"
                cy="120"
                r="112"
                fill="none"
                stroke="url(#timerGradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                filter={isRunning ? "url(#glowFilter)" : undefined}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.2em] mb-2">
                {isBreak ? t.focus.breakTime : t.focus.focusNow}
              </span>
              <p
                className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight"
                data-testid="text-timer"
              >
                {formatTime(timeLeft)}
              </p>
              <span className="text-xs text-muted-foreground mt-2 capitalize font-medium">{mode === "deepWork" ? "Deep Work" : mode}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-8">
            {!isRunning ? (
              <Button size="lg" onClick={start} data-testid="button-start">
                <Play className="w-4 h-4 mr-2" />
                {timeLeft === (isBreak ? getBreakMinutes() * 60 : getWorkMinutes() * 60) ? t.focus.start : t.focus.resume}
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={pause} data-testid="button-pause">
                <Pause className="w-4 h-4 mr-2" />
                {t.focus.pause}
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={reset} data-testid="button-reset">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {subjects.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t.ai.subjectContext}</Label>
          </div>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger data-testid="select-focus-subject">
              <SelectValue placeholder={t.ai.selectSubject} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      )}

      <Dialog open={sessionComplete} onOpenChange={setSessionComplete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="block">{t.focus.sessionComplete}</span>
                <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                  {getWorkMinutes()} min {mode === "deepWork" ? "Deep Work" : mode} session
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.focus.howWasIt}</Label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    className="group relative"
                    data-testid={`button-rating-${r}`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        rating >= r
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t.focus.sessionNotes}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.focus.whatStudied}
                className="resize-none min-h-[80px]"
                data-testid="textarea-session-notes"
              />
            </div>

            <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-md bg-muted/30">
              <Label className="text-sm">{t.focus.needsRevision}</Label>
              <Switch
                checked={needsRevision}
                onCheckedChange={setNeedsRevision}
                data-testid="switch-needs-revision"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSaveSession}
              disabled={saveMutation.isPending}
              data-testid="button-save-session"
            >
              {t.focus.saveSession}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

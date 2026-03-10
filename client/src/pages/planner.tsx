import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/languageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Plus, Calendar, Trash2, CheckCircle2, Circle, AlertCircle, ChevronLeft, ChevronRight, CalendarDays, Clock, ListTodo } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import type { PlannerItem, Subject } from "@shared/schema";

export default function PlannerPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "",
    endTime: "",
    type: "reading",
    subjectId: "",
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 6 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 6 });
  const dateFrom = format(weekStart, "yyyy-MM-dd");
  const dateTo = format(weekEnd, "yyyy-MM-dd");

  const { data: items = [], isLoading } = useQuery<PlannerItem[]>({
    queryKey: ["/api/planner", { from: dateFrom, to: dateTo }],
    queryFn: async () => {
      const res = await fetch(`/api/planner?from=${dateFrom}&to=${dateTo}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/planner", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner"] });
      setOpen(false);
      setForm({
        title: "",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "",
        endTime: "",
        type: "reading",
        subjectId: "",
      });
      toast({ title: t.planner.addTask, description: "Task added successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/planner/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/planner/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planner"] });
      toast({ title: "Task deleted" });
    },
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const statusConfig: Record<string, { color: string; hex: string; icon: typeof CheckCircle2; label: string }> = {
    completed: { color: "bg-emerald-500", hex: "#10b981", icon: CheckCircle2, label: t.planner.completed },
    partial: { color: "bg-amber-500", hex: "#f59e0b", icon: AlertCircle, label: t.planner.partial },
    missed: { color: "bg-red-500", hex: "#ef4444", icon: Circle, label: t.planner.missed },
    pending: { color: "bg-muted-foreground/40", hex: "#9ca3af", icon: Circle, label: t.planner.pending },
  };

  const cycleStatus = (current: string | null) => {
    const order = ["pending", "completed", "partial", "missed"];
    const idx = order.indexOf(current || "pending");
    return order[(idx + 1) % order.length];
  };

  const getSubjectColor = (subjectId: number | null) => {
    if (!subjectId) return null;
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.color || null;
  };

  const getSubjectName = (subjectId: number | null) => {
    if (!subjectId) return null;
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.name || null;
  };

  const totalTasks = items.length;
  const completedTasks = items.filter((i) => i.status === "completed").length;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-planner-title">{t.planner.title}</h1>
            <p className="text-sm text-muted-foreground">
              {totalTasks > 0
                ? `${completedTasks}/${totalTasks} tasks completed this week`
                : "Plan your week ahead"}
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-task">
              <Plus className="w-4 h-4 mr-1.5" /> {t.planner.addTask}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary" />
                {t.planner.addTask}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  title: form.title,
                  description: form.description || undefined,
                  date: form.date,
                  startTime: form.startTime || undefined,
                  endTime: form.endTime || undefined,
                  type: form.type,
                  subjectId: form.subjectId ? parseInt(form.subjectId) : undefined,
                });
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.planner.taskTitle}</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What do you need to do?"
                  required
                  data-testid="input-task-title"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.planner.description}</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Add details (optional)"
                  className="resize-none"
                  rows={2}
                  data-testid="input-task-desc"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.planner.date}</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    data-testid="input-task-date"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.planner.type}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger data-testid="select-task-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reading">{t.types.reading}</SelectItem>
                      <SelectItem value="practice">{t.types.practice}</SelectItem>
                      <SelectItem value="revision">{t.types.revision}</SelectItem>
                      <SelectItem value="memorization">{t.types.memorization}</SelectItem>
                      <SelectItem value="problemSolving">{t.types.problemSolving}</SelectItem>
                      <SelectItem value="mockTest">{t.types.mockTest}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.planner.startTime}</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.planner.endTime}</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    data-testid="input-end-time"
                  />
                </div>
              </div>
              {subjects.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.ai.subjectContext}</Label>
                  <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                    <SelectTrigger data-testid="select-task-subject">
                      <SelectValue placeholder={t.ai.selectSubject} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          <span className="flex items-center gap-2">
                            {s.color && (
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                            )}
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-task">
                {createMutation.isPending ? "Adding..." : t.planner.addTask}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-5">
          <Button size="icon" variant="ghost" onClick={() => setCurrentDate(addDays(currentDate, -7))} data-testid="button-prev-week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setCurrentDate(addDays(currentDate, 7))} data-testid="button-next-week">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayItems = items.filter((i) => i.date === dateStr);
            const isToday = dateStr === today;
            const completedCount = dayItems.filter((i) => i.status === "completed").length;
            return (
              <div
                key={dateStr}
                className={`text-center p-2 sm:p-3 rounded-md min-h-[90px] transition-all ${
                  isToday
                    ? "bg-primary/10 ring-2 ring-primary/40 dark:ring-primary/30"
                    : "bg-muted/40 dark:bg-muted/20"
                }`}
                data-testid={`day-${dateStr}`}
              >
                <p className={`text-[11px] font-semibold uppercase tracking-wider mb-0.5 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {format(day, "EEE")}
                </p>
                <p className={`text-lg font-bold leading-tight ${isToday ? "text-primary" : ""}`}>
                  {format(day, "d")}
                </p>
                {dayItems.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-center gap-1">
                      {dayItems.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className={`w-1.5 h-1.5 rounded-full ${statusConfig[item.status || "pending"].color}`}
                        />
                      ))}
                    </div>
                    <p className={`text-[10px] font-medium ${completedCount === dayItems.length ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {completedCount}/{dayItems.length}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-md" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-md bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-blue-500/60 dark:text-blue-400/60" />
          </div>
          <p className="font-medium mb-1">{t.planner.noTasks}</p>
          <p className="text-sm text-muted-foreground">Add a task to start planning your week</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items
            .sort((a, b) => {
              if (a.date !== b.date) return a.date.localeCompare(b.date);
              return (a.startTime || "").localeCompare(b.startTime || "");
            })
            .map((item, i) => {
              const subjectColor = getSubjectColor(item.subjectId);
              const subjectName = getSubjectName(item.subjectId);
              const status = item.status || "pending";
              const StatusIcon = statusConfig[status].icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card className="overflow-visible hover-elevate" data-testid={`planner-card-${item.id}`}>
                    <div className="flex">
                      <div
                        className="w-1 rounded-l-md flex-shrink-0 transition-colors"
                        style={{ backgroundColor: subjectColor || statusConfig[status].hex }}
                      />
                      <div className="flex items-center gap-3 flex-1 p-3 sm:p-4">
                        <button
                          onClick={() =>
                            updateMutation.mutate({
                              id: item.id,
                              status: cycleStatus(item.status),
                            })
                          }
                          className="flex-shrink-0 transition-transform active:scale-90"
                          data-testid={`button-cycle-status-${item.id}`}
                        >
                          <StatusIcon
                            className={`w-5 h-5 transition-colors ${
                              status === "completed"
                                ? "text-emerald-500"
                                : status === "partial"
                                ? "text-amber-500"
                                : status === "missed"
                                ? "text-red-500"
                                : "text-muted-foreground/50"
                            }`}
                          />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium transition-all ${status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {format(new Date(item.date + "T00:00:00"), "MMM d")}
                            </span>
                            {item.startTime && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.startTime}{item.endTime && ` – ${item.endTime}`}
                              </span>
                            )}
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {item.type}
                            </Badge>
                            {subjectName && (
                              <Badge variant="outline" className="text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full mr-1 flex-shrink-0" style={{ backgroundColor: subjectColor || undefined }} />
                                {subjectName}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(item.id)}
                          data-testid={`button-delete-task-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
        </div>
      )}
    </div>
  );
}

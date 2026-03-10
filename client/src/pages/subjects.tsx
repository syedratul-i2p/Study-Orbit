import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/languageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Plus, BookOpen, Trash2, ChevronRight, GraduationCap, Clock } from "lucide-react";
import { useLocation } from "wouter";
import type { Subject, Topic } from "@shared/schema";

const COLORS = ["#4F46E5", "#0D9488", "#D97706", "#DC2626", "#7C3AED", "#2563EB", "#059669", "#DB2777"];

export default function SubjectsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#4F46E5", weeklyTargetHours: 5, priority: "medium" });

  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/subjects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      setOpen(false);
      setForm({ name: "", color: "#4F46E5", weeklyTargetHours: 5, priority: "medium" });
      toast({ title: t.common.success });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
    },
  });

  const getPriorityStyle = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      case "low":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      default:
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
    }
  };

  const getPriorityLabel = (priority: string | null) => {
    switch (priority) {
      case "high": return t.subjects.high;
      case "low": return t.subjects.low;
      default: return t.subjects.medium;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500/8 via-purple-500/5 to-transparent p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-subjects-title">{t.subjects.title}</h1>
              <p className="text-sm text-muted-foreground">{subjects.length} subjects</p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-subject">
                <Plus className="w-4 h-4 mr-1" /> {t.subjects.addSubject}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.subjects.addSubject}</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate(form);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label>{t.subjects.name}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="e.g. Mathematics"
                    data-testid="input-subject-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.subjects.color}</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className={`w-8 h-8 rounded-md transition-all ${
                          form.color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                        data-testid={`color-${c}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.subjects.weeklyTarget}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={40}
                      value={form.weeklyTargetHours}
                      onChange={(e) => setForm({ ...form, weeklyTargetHours: parseInt(e.target.value) || 5 })}
                      className="w-24"
                      data-testid="input-weekly-target"
                    />
                    <span className="text-sm text-muted-foreground">hours/week</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t.subjects.priority}</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t.subjects.high}</SelectItem>
                      <SelectItem value="medium">{t.subjects.medium}</SelectItem>
                      <SelectItem value="low">{t.subjects.low}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-subject">
                  {t.subjects.addSubject}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 rounded-md" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-md bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-indigo-500/60 dark:text-indigo-400/60" />
          </div>
          <p className="text-muted-foreground font-medium mb-1">{t.subjects.noSubjects}</p>
          <p className="text-sm text-muted-foreground/70">Add your first subject to get started</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map((subject, i) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="overflow-visible cursor-pointer hover-elevate"
                onClick={() => navigate(`/subjects/${subject.id}`)}
                data-testid={`card-subject-${subject.id}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${subject.color || "#4F46E5"}15` }}
                        >
                          <BookOpen className="w-5 h-5" style={{ color: subject.color || "#4F46E5" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate text-base">{subject.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{subject.weeklyTargetHours}h/week</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getPriorityStyle(subject.priority)}`}
                        >
                          {getPriorityLabel(subject.priority)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(subject.id);
                        }}
                        data-testid={`button-delete-subject-${subject.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
                <div
                  className="h-1 rounded-b-md"
                  style={{ backgroundColor: subject.color || "#4F46E5" }}
                />
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

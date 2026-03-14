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
import { Plus, ArrowLeft, Trash2, CheckCircle2, Circle, BookOpen, Calendar, Sparkles, Target } from "lucide-react";
import { useLocation, useParams } from "wouter";
import type { Subject, Topic } from "@shared/schema";
import { PageHeader } from "@/components/page-header";

export default function SubjectDetailPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const subjectId = parseInt(params.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "reading", deadline: "", revisionDate: "" });

  const { data: subject } = useQuery<Subject>({
    queryKey: ["/api/subjects", subjectId],
    queryFn: async () => {
      const res = await fetch(`/api/subjects`);
      const subjects = await res.json();
      return subjects.find((s: Subject) => s.id === subjectId);
    },
  });

  const { data: topics = [], isLoading } = useQuery<Topic[]>({
    queryKey: ["/api/subjects", subjectId, "topics"],
    queryFn: async () => {
      const res = await fetch(`/api/subjects/${subjectId}/topics`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/topics", { ...data, subjectId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects", subjectId, "topics"] });
      setOpen(false);
      setForm({ name: "", type: "reading", deadline: "", revisionDate: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/topics/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects", subjectId, "topics"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/topics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects", subjectId, "topics"] });
    },
  });

  const typeLabels: Record<string, string> = {
    reading: t.types.reading,
    practice: t.types.practice,
    revision: t.types.revision,
    memorization: t.types.memorization,
    problemSolving: t.types.problemSolving,
    mockTest: t.types.mockTest,
  };

  const completedCount = topics.filter(t => t.status === "completed").length;
  const progressPercent = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

  return (
    <div className="app-page space-y-6">
      <PageHeader
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Learning workspace
          </>
        }
        icon={
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${subject?.color || "#4F46E5"}18` }}
          >
            <BookOpen className="h-6 w-6" style={{ color: subject?.color || "#4F46E5" }} />
          </div>
        }
        title={subject?.name || "..."}
        description={`${topics.length} ${t.subjects.topics}`}
      >
        <div className="flex flex-wrap gap-3">
          <div className="app-panel min-w-[8.5rem]">
            <p className="text-xs font-medium text-muted-foreground">Completion</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{progressPercent}%</p>
          </div>
          <div className="app-panel min-w-[8.5rem]">
            <p className="text-xs font-medium text-muted-foreground">Finished topics</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{completedCount}</p>
          </div>
        </div>
      </PageHeader>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button size="icon" variant="ghost" onClick={() => navigate("/subjects")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl px-5" data-testid="button-add-topic">
              <Plus className="w-4 h-4 mr-1" /> {t.subjects.addTopic}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[1.75rem] border-border/70">
            <DialogHeader>
              <DialogTitle>{t.subjects.addTopic}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  name: form.name,
                  type: form.type,
                  deadline: form.deadline || undefined,
                  revisionDate: form.revisionDate || undefined,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Topic Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Quadratic Equations"
                  data-testid="input-topic-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.planner.type}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger data-testid="select-topic-type">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    data-testid="input-deadline"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Revision Date</Label>
                  <Input
                    type="date"
                    value={form.revisionDate}
                    onChange={(e) => setForm({ ...form, revisionDate: e.target.value })}
                    data-testid="input-revision-date"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-topic">
                {t.subjects.addTopic}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {topics.length > 0 && (
          <p className="text-sm text-muted-foreground" data-testid="text-topic-progress">
            <Target className="mr-1 inline h-3.5 w-3.5" />
            {completedCount}/{topics.length} completed
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-18 rounded-md" />)}
        </div>
      ) : topics.length === 0 ? (
        <Card className="app-empty p-10 text-center">
          <div className="app-empty-icon">
            <BookOpen className="w-7 h-7 text-primary/60" />
          </div>
          <p className="font-semibold text-foreground">{t.subjects.noTopics}</p>
          <p className="mt-1 text-sm text-muted-foreground">Add topics to track your progress with clearer deadlines and status.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {topics.map((topic, i) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="app-surface p-4 sm:p-5 overflow-visible hover-elevate" data-testid={`card-topic-${topic.id}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        id: topic.id,
                        status: topic.status === "completed" ? "pending" : "completed",
                      })
                    }
                    className="flex-shrink-0 transition-transform active:scale-90"
                    data-testid={`button-toggle-topic-${topic.id}`}
                  >
                    {topic.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/50" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium transition-colors ${topic.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {topic.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {typeLabels[topic.type || "reading"] || topic.type}
                      </Badge>
                      {topic.deadline && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {topic.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(topic.id)}
                    data-testid={`button-delete-topic-${topic.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Loader2, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from "lucide-react";

export default function OnboardingPage() {
  const { t, setLanguage } = useLanguage();
  const { completeOnboarding } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    institution: "",
    country: t.onboarding.defaultCountry,
    appLanguage: "bn",
    chatLanguage: "auto",
    classLevel: "",
    department: "",
    board: "",
    studyGoals: [] as string[],
    weakSubjects: [] as string[],
    strongSubjects: [] as string[],
    dailyStudyHours: 4,
  });

  const stepHelperText = [t.onboarding.guidedSetup, t.onboarding.subtitle];
  const classOptions = [
    { value: "class-9", label: t.onboarding.classOptions.class9 },
    { value: "class-10", label: t.onboarding.classOptions.class10 },
    { value: "class-11", label: t.onboarding.classOptions.class11 },
    { value: "class-12", label: t.onboarding.classOptions.class12 },
    { value: "diploma", label: t.onboarding.classOptions.diploma },
    { value: "undergraduate", label: t.onboarding.classOptions.undergraduate },
    { value: "graduate", label: t.onboarding.classOptions.graduate },
    { value: "ielts", label: t.onboarding.classOptions.ielts },
    { value: "sat", label: t.onboarding.classOptions.sat },
    { value: "competitive", label: t.onboarding.classOptions.competitive },
  ];
  const departmentOptions = [
    { value: "science", label: t.onboarding.departmentOptions.science },
    { value: "arts", label: t.onboarding.departmentOptions.arts },
    { value: "commerce", label: t.onboarding.departmentOptions.commerce },
    { value: "engineering", label: t.onboarding.departmentOptions.engineering },
    { value: "medical", label: t.onboarding.departmentOptions.medical },
    { value: "cse", label: t.onboarding.departmentOptions.cse },
    { value: "other", label: t.onboarding.departmentOptions.other },
  ];
  const boardOptions = [
    { value: "dhaka", label: t.onboarding.boardOptions.dhaka },
    { value: "rajshahi", label: t.onboarding.boardOptions.rajshahi },
    { value: "chittagong", label: t.onboarding.boardOptions.chittagong },
    { value: "comilla", label: t.onboarding.boardOptions.comilla },
    { value: "sylhet", label: t.onboarding.boardOptions.sylhet },
    { value: "dinajpur", label: t.onboarding.boardOptions.dinajpur },
    { value: "jessore", label: t.onboarding.boardOptions.jessore },
    { value: "barishal", label: t.onboarding.boardOptions.barishal },
    { value: "madrasah", label: t.onboarding.boardOptions.madrasah },
    { value: "technical", label: t.onboarding.boardOptions.technical },
    { value: "national-university", label: t.onboarding.boardOptions.nationalUniversity },
    { value: "cambridge", label: t.onboarding.boardOptions.cambridge },
    { value: "other", label: t.onboarding.boardOptions.other },
  ];

  const steps = [
    {
      title: t.onboarding.title,
      fields: (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>{t.onboarding.appLanguage}</Label>
            <Select
              value={form.appLanguage}
              onValueChange={(v) => {
                setForm({ ...form, appLanguage: v });
                setLanguage(v as "en" | "bn");
              }}
            >
              <SelectTrigger data-testid="select-app-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t.settings.english}</SelectItem>
                <SelectItem value="bn">{t.settings.bangla}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.onboarding.chatLanguage}</Label>
            <Select value={form.chatLanguage} onValueChange={(v) => setForm({ ...form, chatLanguage: v })}>
              <SelectTrigger data-testid="select-chat-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t.settings.auto}</SelectItem>
                <SelectItem value="bn">{t.settings.bangla}</SelectItem>
                <SelectItem value="en">{t.settings.english}</SelectItem>
                <SelectItem value="bilingual">{t.settings.bilingual}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.onboarding.country}</Label>
            <Input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              data-testid="input-country"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t.onboarding.institution}</Label>
            <Input
              value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
              placeholder={t.onboarding.institutionPlaceholder}
              data-testid="input-institution"
            />
          </div>
        </div>
      ),
    },
    {
      title: t.onboarding.subtitle,
      fields: (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>{t.onboarding.classLevel}</Label>
            <Select value={form.classLevel} onValueChange={(v) => setForm({ ...form, classLevel: v })}>
              <SelectTrigger data-testid="select-class-level">
                <SelectValue placeholder={t.common.select} />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.onboarding.department}</Label>
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
              <SelectTrigger data-testid="select-department">
                <SelectValue placeholder={t.common.select} />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.onboarding.board}</Label>
            <Select value={form.board} onValueChange={(v) => setForm({ ...form, board: v })}>
              <SelectTrigger data-testid="select-board">
                <SelectValue placeholder={t.common.select} />
              </SelectTrigger>
              <SelectContent>
                {boardOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.onboarding.dailyHours}</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={16}
                value={form.dailyStudyHours}
                onChange={(e) => setForm({ ...form, dailyStudyHours: parseInt(e.target.value) || 4 })}
                className="w-20"
                data-testid="input-daily-hours"
              />
              <span className="text-sm text-muted-foreground">{t.onboarding.hoursPerDay}</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleFinish = async () => {
    setLoading(true);
    try {
      await completeOnboarding(form);
      toast({ title: t.common.success, description: t.onboarding.setupSuccess });
      setTimeout(() => navigate("/dashboard"), 100);
    } catch (error: any) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(13,148,136,0.08),transparent_32%)] px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center"
      >
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_minmax(0,1fr)]">
          <div className="hidden rounded-[2rem] border border-border/60 bg-card/70 p-8 shadow-xl shadow-black/5 backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {t.onboarding.guidedSetup}
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{t.app.name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{t.onboarding.introTitle}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[t.onboarding.benefitLanguage, t.onboarding.benefitAcademic, t.onboarding.benefitRoutine].map((item) => (
                <div key={item} className="app-panel flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full">
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold">{t.app.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t.onboarding.introTitle}</p>
            </div>

            <Card className="app-surface p-6 sm:p-7">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="app-kicker">
                    {t.onboarding.stepLabel} {step + 1} / {steps.length}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">{steps[step].title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{stepHelperText[step]}</p>
                </div>
                <div className="flex items-center gap-2">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 rounded-full transition-all ${
                        i === step ? "w-10 bg-primary" : i < step ? "w-8 bg-primary/50" : "w-8 bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {steps[step].fields}
                </motion.div>
              </AnimatePresence>

              <div className="mt-8 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  data-testid="button-back"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t.onboarding.back}
                </Button>
                {step < steps.length - 1 ? (
                  <Button onClick={() => setStep(step + 1)} data-testid="button-next" className="rounded-2xl px-5">
                    {t.onboarding.next}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleFinish} disabled={loading} data-testid="button-finish" className="rounded-2xl px-5">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.onboarding.finish}
                  </Button>
                )}
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={handleFinish}
                  className="text-sm font-medium text-muted-foreground underline underline-offset-4"
                  data-testid="button-skip"
                >
                  {t.onboarding.skip}
                </button>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

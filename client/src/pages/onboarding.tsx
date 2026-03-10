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
import { GraduationCap, Loader2, ChevronRight, ChevronLeft } from "lucide-react";

export default function OnboardingPage() {
  const { t, setLanguage } = useLanguage();
  const { completeOnboarding } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    institution: "",
    country: "Bangladesh",
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

  const steps = [
    {
      title: t.onboarding.title,
      fields: (
        <div className="space-y-4">
          <div>
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
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="bn">বাংলা</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
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
          <div>
            <Label>{t.onboarding.country}</Label>
            <Input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              data-testid="input-country"
            />
          </div>
          <div>
            <Label>{t.onboarding.institution}</Label>
            <Input
              value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
              placeholder="e.g., Dhaka College"
              data-testid="input-institution"
            />
          </div>
        </div>
      ),
    },
    {
      title: t.onboarding.subtitle,
      fields: (
        <div className="space-y-4">
          <div>
            <Label>{t.onboarding.classLevel}</Label>
            <Select value={form.classLevel} onValueChange={(v) => setForm({ ...form, classLevel: v })}>
              <SelectTrigger data-testid="select-class-level">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class-9">Class 9</SelectItem>
                <SelectItem value="class-10">Class 10 (SSC)</SelectItem>
                <SelectItem value="class-11">Class 11 (HSC 1st Year)</SelectItem>
                <SelectItem value="class-12">Class 12 (HSC 2nd Year)</SelectItem>
                <SelectItem value="diploma">Diploma</SelectItem>
                <SelectItem value="undergraduate">Undergraduate</SelectItem>
                <SelectItem value="graduate">Graduate</SelectItem>
                <SelectItem value="ielts">IELTS Preparation</SelectItem>
                <SelectItem value="sat">SAT Preparation</SelectItem>
                <SelectItem value="competitive">Competitive Exam</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t.onboarding.department}</Label>
            <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
              <SelectTrigger data-testid="select-department">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="science">Science</SelectItem>
                <SelectItem value="arts">Arts / Humanities</SelectItem>
                <SelectItem value="commerce">Commerce / Business</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="cse">CSE / IT</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t.onboarding.board}</Label>
            <Select value={form.board} onValueChange={(v) => setForm({ ...form, board: v })}>
              <SelectTrigger data-testid="select-board">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dhaka">Dhaka Board</SelectItem>
                <SelectItem value="rajshahi">Rajshahi Board</SelectItem>
                <SelectItem value="chittagong">Chittagong Board</SelectItem>
                <SelectItem value="comilla">Comilla Board</SelectItem>
                <SelectItem value="sylhet">Sylhet Board</SelectItem>
                <SelectItem value="dinajpur">Dinajpur Board</SelectItem>
                <SelectItem value="jessore">Jessore Board</SelectItem>
                <SelectItem value="barishal">Barishal Board</SelectItem>
                <SelectItem value="madrasah">Madrasah Board</SelectItem>
                <SelectItem value="technical">Technical Board</SelectItem>
                <SelectItem value="national-university">National University</SelectItem>
                <SelectItem value="cambridge">Cambridge / Edexcel</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
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
              <span className="text-sm text-muted-foreground">hours/day</span>
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
      toast({ title: t.common.success, description: "Profile set up successfully!" });
      setTimeout(() => navigate("/dashboard"), 100);
    } catch (error: any) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-background to-teal-50 dark:from-indigo-950/20 dark:via-background dark:to-teal-950/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{t.app.name}</h1>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-8 bg-primary" : i < step ? "w-8 bg-primary/50" : "w-8 bg-muted"
              }`}
            />
          ))}
        </div>

        <Card className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-semibold mb-4">{steps[step].title}</h2>
              {steps[step].fields}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-2 mt-6">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t.onboarding.back}
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} data-testid="button-next">
                {t.onboarding.next}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={loading} data-testid="button-finish">
                {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                {t.onboarding.finish}
              </Button>
            )}
          </div>
          <div className="text-center mt-3">
            <button
              onClick={handleFinish}
              className="text-sm text-muted-foreground underline"
              data-testid="button-skip"
            >
              {t.onboarding.skip}
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

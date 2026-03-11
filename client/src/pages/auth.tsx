import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Loader2, Mail, Lock, User, ArrowLeft, KeyRound,
  Eye, EyeOff, Sparkles, BookOpen, Brain, Shield, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";

const fadeSlide = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const inputClass = "h-12 rounded-2xl border-border/60 bg-background/70 pl-10 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground/50 hover:border-border focus:border-primary/45 focus:bg-background focus:ring-4 focus:ring-primary/10";
const inputClassWithRight = inputClass + " pr-11";
const labelClass = "text-[12px] font-semibold uppercase tracking-[0.2em] text-muted-foreground";
const iconClass = "absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground/60";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-1.5 mt-1.5"
    >
      <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
      <span className="text-xs text-destructive/90 font-medium leading-tight" data-testid="text-field-error">{message}</span>
    </motion.div>
  );
}

function mapServerError(msg: string, t: any): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid credentials") || lower.includes("wrong password"))
    return t.auth.errors?.invalidCredentials || "Incorrect email or password. Please try again.";
  if (lower.includes("email already") || lower.includes("already registered"))
    return t.auth.errors?.emailTaken || "This email is already registered. Try signing in instead.";
  if (lower.includes("username already") || lower.includes("already taken"))
    return t.auth.errors?.usernameTaken || "This username is taken. Choose a different one.";
  if (lower.includes("password") && lower.includes("6"))
    return t.auth.errors?.weakPassword || "Password is too short. Use at least 6 characters.";
  if (lower.includes("not found") || lower.includes("no account"))
    return t.auth.errors?.noAccount || "No account found with this email.";
  if (lower.includes("invalid code") || lower.includes("expired"))
    return t.auth.errors?.invalidCode || "Code is invalid or expired. Request a new one.";
  if (lower.includes("all fields") || lower.includes("required"))
    return t.auth.errors?.missingFields || "Please fill in all required fields.";
  return msg;
}

function PasswordStrength({ password }: { password: string }) {
  const { t } = useLanguage();
  const checks = useMemo(() => {
    const has6 = password.length >= 6;
    const has8 = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return { has6, has8, hasUpper, hasNumber, hasSpecial };
  }, [password]);

  if (!password) return null;

  const score = [checks.has6, checks.has8, checks.hasUpper, checks.hasNumber, checks.hasSpecial].filter(Boolean).length;
  const color = score <= 1 ? "bg-red-500" : score <= 2 ? "bg-orange-500" : score <= 3 ? "bg-yellow-500" : score <= 4 ? "bg-emerald-400" : "bg-emerald-500";
  const label = score <= 1 ? (t.auth.errors?.strengthWeak || "Weak") : score <= 2 ? (t.auth.errors?.strengthFair || "Fair") : score <= 3 ? (t.auth.errors?.strengthGood || "Good") : (t.auth.errors?.strengthStrong || "Strong");

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.2 }}
      className="mt-2 space-y-1.5"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-[11px] font-medium text-muted-foreground" data-testid="text-password-strength">{label}</p>
    </motion.div>
  );
}

function OTPInput({ value, onChange, length = 6 }: { value: string; onChange: (v: string) => void; length?: number }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, "").split("").slice(0, length);

  const handleChange = (idx: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const arr = digits.slice();
    arr[idx] = char;
    onChange(arr.join(""));
    if (char && idx < length - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center" data-testid="otp-input-group">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-14 w-12 rounded-2xl border border-border/60 bg-background/75 text-center text-lg font-semibold shadow-sm transition-all duration-200 outline-none hover:border-border focus:border-primary/45 focus:bg-background focus:ring-4 focus:ring-primary/10"
          data-testid={`otp-digit-${i}`}
        />
      ))}
    </div>
  );
}

function AuthSidePanel() {
  const { t } = useLanguage();
  return (
    <div className="relative hidden min-h-screen overflow-hidden border-r border-white/10 bg-[linear-gradient(160deg,#2448d8_0%,#1d4ed8_38%,#155e75_100%)] px-10 py-12 text-white lg:flex lg:w-[48%] lg:flex-col">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_26rem)]" />
        <div className="absolute -left-16 top-16 h-64 w-64 rounded-full bg-white/12 blur-3xl" />
        <div className="absolute bottom-12 right-0 h-72 w-72 rounded-full bg-cyan-200/12 blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm shadow-lg shadow-black/15">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight">{t.app.name}</p>
          <p className="text-sm text-white/70">Structure. Focus. Mastery.</p>
        </div>
      </div>

      <div className="relative z-10 my-auto max-w-xl space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/78">
          <Sparkles className="h-3.5 w-3.5" />
          {t.landing.heroTag}
        </div>
        <div>
          <h2 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            {t.landing.hero}
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-white/72">
            {t.landing.heroSub}
          </p>
        </div>

        <div className="grid gap-3">
          {[
            { icon: Brain, title: "AI guidance", text: "Ask, revise, and explain difficult topics in study-friendly steps." },
            { icon: BookOpen, title: "Study structure", text: "Keep subjects, planner blocks, and focus sessions in one calm workspace." },
            { icon: Shield, title: "Private by default", text: "Sessions, backups, and progress stay connected to your account experience." },
          ].map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.08 * i }}
              className="rounded-[1.5rem] border border-white/14 bg-white/8 p-4 backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/14">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/68">{text}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "2", label: "Languages" },
            { value: "24/7", label: "Study support" },
            { value: "All-in-1", label: "Workspace" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[1.35rem] border border-white/12 bg-white/8 px-4 py-3 text-center backdrop-blur-sm">
              <p className="text-xl font-semibold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/62">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 text-xs font-medium uppercase tracking-[0.24em] text-white/40">
        {t.landing.platformFeatures}
      </div>
    </div>
  );
}

function AuthFormContainer({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_18rem)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-background via-background/90 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[32rem]"
      >
        <div className="rounded-[2rem] border border-card-border/80 bg-card/92 p-6 shadow-[0_20px_70px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 shadow-lg shadow-indigo-500/25">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">{t.app.name}</p>
              <p className="text-sm text-muted-foreground">{t.app.tagline}</p>
            </div>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function PremiumButton({ children, loading, ...props }: { children: React.ReactNode; loading?: boolean } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      {...props}
      className={`h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/25 active:scale-[0.99] ${props.className || ""}`}
    >
      {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
      {children}
    </Button>
  );
}

export function LoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"password" | "otp-send" | "otp-verify">("password");
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const validateLogin = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = t.auth.errors?.emailRequired || "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t.auth.errors?.emailInvalid || "Enter a valid email address";
    if (!password) e.password = t.auth.errors?.passwordRequired || "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!validateLogin()) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (error: any) {
      setFormError(mapServerError(error.message, t));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpEmail)) {
      setErrors({ otpEmail: t.auth.errors?.emailInvalid || "Enter a valid email address" });
      return;
    }
    setSendingCode(true);
    setFormError("");
    try {
      const res = await apiRequest("POST", "/api/auth/send-code", { email: otpEmail, type: "login" });
      const data = await res.json();
      toast({ title: t.auth.codeSent, description: t.auth.codeExpiry });
      if (data._devCode) toast({ title: "Dev Mode", description: `Code: ${data._devCode}` });
      setMode("otp-verify");
    } catch (error: any) {
      setFormError(mapServerError(error.message, t));
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    try {
      const res = await apiRequest("POST", "/api/auth/verify-login", { email: otpEmail, code: otpCode });
      await res.json();
      await new Promise(r => setTimeout(r, 100));
      window.location.href = "/dashboard";
    } catch (error: any) {
      setFormError(mapServerError(error.message, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <AuthSidePanel />
      <AuthFormContainer>
        <div className="mb-8 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]" data-testid="text-login-title">
            {t.auth.welcomeBack}
          </h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{t.auth.loginSubtitle}</p>
        </div>

        <AnimatePresence mode="wait">
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3.5 shadow-sm"
              data-testid="text-form-error"
            >
              <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive/90 font-medium leading-snug">{formError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {mode === "password" && (
            <motion.div key="password" {...fadeSlide} transition={{ duration: 0.25 }}>
              <form onSubmit={handlePasswordLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className={labelClass}>{t.auth.email}</Label>
                  <div className="relative">
                    <Mail className={iconClass} />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); setFormError(""); }}
                      className={`${inputClass} ${errors.email ? "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/15" : ""}`}
                      placeholder="you@example.com"
                      data-testid="input-email"
                    />
                  </div>
                  <AnimatePresence><FieldError message={errors.email} /></AnimatePresence>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className={labelClass}>{t.auth.password}</Label>
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="text-xs text-primary/80 hover:text-primary font-medium transition-colors"
                      data-testid="link-forgot-password"
                    >
                      {t.auth.forgotPassword}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className={iconClass} />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); setFormError(""); }}
                      className={`${inputClassWithRight} ${errors.password ? "border-destructive/50 focus:border-destructive/50 focus:ring-destructive/15" : ""}`}
                      placeholder="Enter your password"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <AnimatePresence><FieldError message={errors.password} /></AnimatePresence>
                </div>
                <PremiumButton type="submit" disabled={loading} loading={loading} data-testid="button-submit-login">
                  {t.auth.signIn}
                </PremiumButton>
              </form>

              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-4 bg-gradient-to-b from-background to-muted/20 text-muted-foreground/60 uppercase tracking-widest font-medium text-[11px]">{t.auth.orDivider}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl border-border/70 bg-background/60 text-sm font-semibold shadow-sm transition-all duration-200 hover:bg-muted/40"
                onClick={() => { setMode("otp-send"); setFormError(""); setErrors({}); }}
                data-testid="button-login-otp"
              >
                <KeyRound className="mr-2 w-4 h-4 text-muted-foreground" />
                {t.auth.loginWithCode}
              </Button>
            </motion.div>
          )}

          {mode === "otp-send" && (
            <motion.div key="otp-send" {...fadeSlide} transition={{ duration: 0.25 }}>
              <button
                onClick={() => { setMode("password"); setFormError(""); setErrors({}); }}
                className="group mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground/75 transition-colors hover:text-foreground"
                data-testid="button-back-login"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> {t.auth.loginWithPassword}
              </button>
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div className="text-center mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Mail className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">{t.auth.loginWithCode}</h3>
                  <p className="text-sm text-muted-foreground/70 mt-1">{t.auth.enterCode}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>{t.auth.email}</Label>
                  <div className="relative">
                    <Mail className={iconClass} />
                    <Input
                      type="email"
                      value={otpEmail}
                      onChange={(e) => { setOtpEmail(e.target.value); setErrors({}); setFormError(""); }}
                      className={`${inputClass} ${errors.otpEmail ? "border-destructive/50" : ""}`}
                      placeholder="you@example.com"
                      data-testid="input-otp-email"
                    />
                  </div>
                  <AnimatePresence><FieldError message={errors.otpEmail} /></AnimatePresence>
                </div>
                <PremiumButton type="submit" disabled={sendingCode} loading={sendingCode} data-testid="button-send-code">
                  {t.auth.sendCode}
                </PremiumButton>
              </form>
            </motion.div>
          )}

          {mode === "otp-verify" && (
            <motion.div key="otp-verify" {...fadeSlide} transition={{ duration: 0.25 }}>
              <button
                onClick={() => { setMode("otp-send"); setFormError(""); }}
                className="group mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground/75 transition-colors hover:text-foreground"
                data-testid="button-back-otp-send"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> {t.common.back}
              </button>
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="text-center mb-2">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <KeyRound className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-lg">{t.auth.verifyCode}</h3>
                  <p className="text-sm text-muted-foreground/70 mt-1">{t.auth.enterCode}</p>
                  <p className="text-xs text-primary font-medium mt-1.5">{otpEmail}</p>
                </div>
                <OTPInput value={otpCode} onChange={setOtpCode} />
                <p className="text-xs text-center text-muted-foreground/60">{t.auth.codeExpiry}</p>
                <PremiumButton type="submit" disabled={loading || otpCode.length < 6} loading={loading} data-testid="button-verify-code">
                  {t.auth.verifyCode}
                </PremiumButton>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-9 text-center text-sm text-muted-foreground/75">
          {t.auth.noAccount}{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
            data-testid="link-register"
          >
            {t.auth.signUp}
          </button>
        </p>
      </AuthFormContainer>
    </div>
  );
}

export function RegisterPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", username: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const validateRegister = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = t.auth.errors?.nameRequired || "Full name is required";
    if (!form.username.trim()) e.username = t.auth.errors?.usernameRequired || "Username is required";
    else if (form.username.length < 3) e.username = t.auth.errors?.usernameTooShort || "Username must be at least 3 characters";
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) e.username = t.auth.errors?.usernameInvalid || "Only letters, numbers, and underscores";
    if (!form.email.trim()) e.email = t.auth.errors?.emailRequired || "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t.auth.errors?.emailInvalid || "Enter a valid email address";
    if (!form.password) e.password = t.auth.errors?.passwordRequired || "Password is required";
    else if (form.password.length < 6) e.password = t.auth.errors?.weakPassword || "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!validateRegister()) return;
    setLoading(true);
    try {
      await register(form.email, form.password, form.fullName, form.username);
      navigate("/onboarding");
    } catch (error: any) {
      setFormError(mapServerError(error.message, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <AuthSidePanel />
      <AuthFormContainer>
        <div className="mb-8 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]" data-testid="text-register-title">
            {t.auth.joinUs}
          </h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{t.auth.registerSubtitle}</p>
        </div>

        <AnimatePresence>
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3.5 shadow-sm"
              data-testid="text-form-error"
            >
              <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive/90 font-medium leading-snug">{formError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={labelClass}>{t.auth.fullName}</Label>
              <div className="relative">
                <User className={iconClass} />
                <Input
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  className={`${inputClass} ${errors.fullName ? "border-destructive/50" : ""}`}
                  placeholder="John Doe"
                  data-testid="input-fullname"
                />
              </div>
              <AnimatePresence><FieldError message={errors.fullName} /></AnimatePresence>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t.auth.username}</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-sm font-medium">@</span>
                <Input
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  className={`h-12 rounded-2xl border-border/60 bg-background/70 pl-8 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground/50 hover:border-border focus:border-primary/45 focus:bg-background focus:ring-4 focus:ring-primary/10 ${errors.username ? "border-destructive/50" : ""}`}
                  placeholder="username"
                  data-testid="input-username"
                />
              </div>
              <AnimatePresence><FieldError message={errors.username} /></AnimatePresence>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>{t.auth.email}</Label>
            <div className="relative">
              <Mail className={iconClass} />
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={`${inputClass} ${errors.email ? "border-destructive/50" : ""}`}
                placeholder="you@example.com"
                data-testid="input-email"
              />
            </div>
            <AnimatePresence><FieldError message={errors.email} /></AnimatePresence>
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>{t.auth.password}</Label>
            <div className="relative">
              <Lock className={iconClass} />
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                className={`${inputClassWithRight} ${errors.password ? "border-destructive/50" : ""}`}
                placeholder="Min. 6 characters"
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                data-testid="button-toggle-password-register"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <AnimatePresence><FieldError message={errors.password} /></AnimatePresence>
            <PasswordStrength password={form.password} />
          </div>
          <PremiumButton type="submit" disabled={loading} loading={loading} data-testid="button-submit-register">
            {t.auth.signUp}
          </PremiumButton>
        </form>

        <p className="mt-9 text-center text-sm text-muted-foreground/75">
          {t.auth.hasAccount}{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
            data-testid="link-login"
          >
            {t.auth.signIn}
          </button>
        </p>
      </AuthFormContainer>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "code" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: t.auth.errors?.emailInvalid || "Enter a valid email address" });
      return;
    }
    setLoading(true);
    setFormError("");
    try {
      const res = await apiRequest("POST", "/api/auth/send-code", { email, type: "reset" });
      const data = await res.json();
      toast({ title: t.auth.codeSent, description: t.auth.codeExpiry });
      if (data._devCode) toast({ title: "Dev Mode", description: `Code: ${data._devCode}` });
      setStep("code");
    } catch (error: any) {
      setFormError(mapServerError(error.message, t));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setLoading(true);
    setFormError("");
    try {
      const res = await apiRequest("POST", "/api/auth/verify-code", { email, code, type: "reset" });
      const data = await res.json();
      setResetToken(data._resetToken);
      setStep("reset");
    } catch (error: any) {
      setFormError(mapServerError(error.message, t));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!newPassword || newPassword.length < 6) errs.newPassword = t.auth.errors?.weakPassword || "Password must be at least 6 characters";
    if (newPassword !== confirmPassword) errs.confirmPassword = t.auth.passwordsMismatch;
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    setFormError("");
    try {
      await apiRequest("POST", "/api/auth/reset-password", { email, code: resetToken, newPassword });
      toast({ title: t.auth.passwordResetSuccess });
      navigate("/login");
    } catch (error: any) {
      setFormError(mapServerError(error.message, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <AuthSidePanel />
      <AuthFormContainer>
        <button
          onClick={() => navigate("/login")}
          className="group mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground/75 transition-colors hover:text-foreground"
          data-testid="button-back-to-login"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> {t.auth.signIn}
        </button>

        <AnimatePresence>
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 flex items-start gap-2.5 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3.5 shadow-sm"
              data-testid="text-form-error"
            >
              <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive/90 font-medium leading-snug">{formError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === "email" && (
            <motion.div key="email" {...fadeSlide} transition={{ duration: 0.25 }}>
              <div className="text-center mb-7">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Lock className="w-8 h-8 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold" data-testid="text-forgot-title">{t.auth.resetPassword}</h1>
                <p className="text-sm text-muted-foreground/70 mt-1.5">{t.auth.enterCode}</p>
              </div>
              <form onSubmit={handleSendCode} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className={labelClass}>{t.auth.email}</Label>
                  <div className="relative">
                    <Mail className={iconClass} />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrors({}); setFormError(""); }}
                      className={`${inputClass} ${errors.email ? "border-destructive/50" : ""}`}
                      placeholder="you@example.com"
                      data-testid="input-reset-email"
                    />
                  </div>
                  <AnimatePresence><FieldError message={errors.email} /></AnimatePresence>
                </div>
                <PremiumButton type="submit" disabled={loading} loading={loading} data-testid="button-send-reset-code">
                  {t.auth.sendCode}
                </PremiumButton>
              </form>
            </motion.div>
          )}

          {step === "code" && (
            <motion.div key="code" {...fadeSlide} transition={{ duration: 0.25 }}>
              <div className="text-center mb-7">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <KeyRound className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="font-bold text-lg">{t.auth.verifyCode}</h3>
                <p className="text-sm text-muted-foreground/70 mt-1">{t.auth.enterCode}</p>
                <p className="text-xs text-primary font-medium mt-1.5">{email}</p>
              </div>
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <OTPInput value={code} onChange={setCode} />
                <p className="text-xs text-center text-muted-foreground/60">{t.auth.codeExpiry}</p>
                <PremiumButton type="submit" disabled={code.length < 6 || loading} loading={loading} data-testid="button-verify-reset-code">
                  {t.auth.verifyCode}
                </PremiumButton>
              </form>
            </motion.div>
          )}

          {step === "reset" && (
            <motion.div key="reset" {...fadeSlide} transition={{ duration: 0.25 }}>
              <div className="text-center mb-7">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/8 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Shield className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="font-bold text-lg">{t.auth.resetPassword}</h3>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className={labelClass}>{t.auth.newPassword}</Label>
                  <div className="relative">
                    <Lock className={iconClass} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setErrors(p => ({ ...p, newPassword: "" })); }}
                      minLength={6}
                      className={`${inputClassWithRight} ${errors.newPassword ? "border-destructive/50" : ""}`}
                      placeholder="Min. 6 characters"
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <AnimatePresence><FieldError message={errors.newPassword} /></AnimatePresence>
                  <PasswordStrength password={newPassword} />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>{t.auth.confirmNewPassword}</Label>
                  <div className="relative">
                    <Lock className={iconClass} />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: "" })); }}
                      minLength={6}
                      className={`${inputClass} ${errors.confirmPassword ? "border-destructive/50" : ""}`}
                      placeholder="Confirm password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                  <AnimatePresence><FieldError message={errors.confirmPassword} /></AnimatePresence>
                </div>
                <PremiumButton type="submit" disabled={loading} loading={loading} data-testid="button-reset-password">
                  {t.auth.resetPassword}
                </PremiumButton>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthFormContainer>
    </div>
  );
}




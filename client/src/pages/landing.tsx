import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/lib/languageContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Brain,
  Calendar,
  Timer,
  BarChart3,
  Languages,
  FolderOpen,
  ArrowRight,
  GraduationCap,
  Sparkles,
  ChevronDown,
  Zap,
  Shield,
  MessageSquare,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function LandingPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const features = [
    { icon: Brain, title: t.landing.aiAssistant, desc: t.landing.aiAssistantDesc, bg: "bg-violet-500/10", iconColor: "text-violet-500" },
    { icon: Calendar, title: t.landing.smartPlanner, desc: t.landing.smartPlannerDesc, bg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    { icon: Timer, title: t.landing.focusTools, desc: t.landing.focusToolsDesc, bg: "bg-amber-500/10", iconColor: "text-amber-500" },
    { icon: BarChart3, title: t.landing.trackProgress, desc: t.landing.trackProgressDesc, bg: "bg-pink-500/10", iconColor: "text-pink-500" },
    { icon: Languages, title: t.landing.bilingual, desc: t.landing.bilingualDesc, bg: "bg-cyan-500/10", iconColor: "text-cyan-500" },
    { icon: FolderOpen, title: t.landing.collaboration, desc: t.landing.collaborationDesc, bg: "bg-orange-500/10", iconColor: "text-orange-500" },
  ];

  const stats = [
    { value: "500+", label: t.landing.stat1, icon: FolderOpen },
    { value: "10K+", label: t.landing.stat2, icon: Timer },
    { value: "25K+", label: t.landing.stat3, icon: MessageSquare },
    { value: "2", label: t.landing.stat4, icon: Languages },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b bg-background/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-teal-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight" data-testid="text-app-name">{t.app.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground hover:text-foreground" data-testid="button-login">
              {t.auth.signIn}
            </Button>
            <Button size="sm" onClick={() => navigate("/register")} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-500/25 text-white border-0" data-testid="button-register">
              {t.auth.signUp}
              <ArrowRight className="ml-1 w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-background to-background dark:from-indigo-950/30 dark:via-background dark:to-background" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-indigo-400/20 via-blue-400/10 to-teal-400/20 dark:from-indigo-600/10 dark:via-blue-600/5 dark:to-teal-600/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-72 h-72 bg-gradient-to-bl from-purple-400/15 to-transparent dark:from-purple-600/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-teal-400/10 to-transparent dark:from-teal-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-32">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-background/80 backdrop-blur-sm text-sm font-medium text-muted-foreground mb-8 shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {t.landing.heroTag}
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]"
              data-testid="text-hero-title"
            >
              <span className="bg-gradient-to-r from-gray-900 via-indigo-900 to-gray-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
                {t.landing.hero}
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
              data-testid="text-hero-subtitle"
            >
              {t.landing.heroSub}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate("/register")}
                className="text-base px-8 h-12 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-xl shadow-indigo-500/25 text-white border-0 rounded-xl"
                data-testid="button-get-started"
              >
                {t.landing.getStarted}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-base px-8 h-12 rounded-xl"
                data-testid="button-learn-more"
              >
                {t.landing.learnMore}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.6 } } }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-16 sm:mt-24 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className="text-center p-4 rounded-2xl bg-background/60 backdrop-blur-sm border shadow-sm"
              >
                <stat.icon className="w-5 h-5 text-indigo-500 mx-auto mb-2" />
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-4">
              <Zap className="w-3.5 h-3.5" />
              {t.landing.platformFeatures}
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
              {t.landing.features}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              {t.landing.featuresDesc}
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {features.map((feature, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="group relative p-6 h-full border-transparent hover:border-primary/20 transition-all duration-300 bg-card hover:shadow-lg hover:shadow-primary/5 overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-primary/[0.02] group-hover:to-primary/[0.05] transition-all duration-300" />
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors" data-testid={`text-feature-title-${i}`}>
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-700 dark:from-indigo-900 dark:to-blue-950" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-teal-400/20 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm font-medium text-white/80 mb-6">
              <Shield className="w-3.5 h-3.5" />
              {t.landing.bilingualBadge}
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 text-white tracking-tight">
              {t.landing.ctaTitle}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/70 text-base sm:text-lg max-w-xl mx-auto mb-8">
              {t.landing.ctaDesc}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate("/register")}
                className="text-base px-8 h-12 bg-white text-indigo-700 hover:bg-white/90 shadow-xl shadow-black/20 rounded-xl font-semibold border-0"
                data-testid="button-cta-bottom"
              >
                {t.landing.getStarted}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/login")}
                className="text-base px-8 h-12 rounded-xl border-white/30 text-white hover:bg-white/10 hover:text-white"
                data-testid="button-cta-login"
              >
                {t.auth.signIn}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t py-8 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">{t.app.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Study Orbit — {t.landing.trustedBy}
          </p>
        </div>
      </footer>
    </div>
  );
}

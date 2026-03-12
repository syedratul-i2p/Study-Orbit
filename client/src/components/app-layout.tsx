import { useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/languageContext";
import { useTheme } from "@/lib/theme";
import AIWidget from "@/components/ai-widget";
import { startAutoSnapshots } from "@/lib/backupManager";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Home,
  Calendar,
  Timer,
  Brain,
  BookOpen,
  BarChart3,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  GraduationCap,
  Languages,
  Users,
  MessageCircle,
  Sparkles,
} from "lucide-react";

function AppSidebar() {
  const { t } = useLanguage();
  const { logout, user } = useAuth();
  const [location] = useLocation();

  const items = [
    { title: t.nav.home, url: "/dashboard", icon: Home },
    { title: t.nav.subjects, url: "/subjects", icon: BookOpen },
    { title: t.nav.planner, url: "/planner", icon: Calendar },
    { title: t.nav.focus, url: "/focus", icon: Timer },
    { title: t.nav.ai, url: "/ai", icon: Brain },
    { title: t.nav.progress, url: "/progress", icon: BarChart3 },
    { title: t.nav.friends, url: "/friends", icon: Users },
    { title: t.nav.chat, url: "/chat", icon: MessageCircle },
    { title: t.nav.profile, url: "/profile", icon: User },
    { title: t.nav.settings, url: "/settings", icon: Settings },
  ];

  return (
    <Sidebar className="p-3">
      <SidebarHeader className="rounded-[1.5rem] border border-sidebar-border/80 bg-sidebar/90 px-4 py-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">{t.app.name}</p>
            <p className="text-xs text-muted-foreground">{t.app.tagline}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-sidebar-border/70 bg-background/70 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t.dashboard.welcome}</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{user?.fullName || t.app.name}</p>
          <p className="truncate text-xs text-muted-foreground">@{user?.username || "studyorbit"}</p>
        </div>
      </SidebarHeader>
      <SidebarContent className="mt-3">
        <SidebarGroup className="rounded-[1.5rem] border border-sidebar-border/80 bg-sidebar/85 p-3 shadow-sm backdrop-blur-sm">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item) => {
                const active = location === item.url || (item.url !== "/dashboard" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} className="h-11 rounded-2xl px-3 text-[13px] font-medium">
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start rounded-2xl border-sidebar-border/80 bg-sidebar/90 px-3 py-2.5 text-[13px] font-medium shadow-sm"
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t.nav.logout}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function MobileNav() {
  const { t } = useLanguage();
  const [location] = useLocation();

  const items = [
    { title: t.nav.home, url: "/dashboard", icon: Home },
    { title: t.nav.planner, url: "/planner", icon: Calendar },
    { title: t.nav.focus, url: "/focus", icon: Timer },
    { title: t.nav.chat, url: "/chat", icon: MessageCircle },
    { title: t.nav.progress, url: "/progress", icon: BarChart3 },
  ];

  return (
    <div className="safe-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/85 px-3 pt-2 backdrop-blur-xl md:hidden">
      <nav className="mx-auto flex h-16 max-w-xl items-center justify-between gap-1 rounded-[1.5rem] border border-border/70 bg-card/90 px-2 shadow-lg shadow-black/5">
        {items.map((item) => {
          const active = location === item.url;
          return (
            <Link key={item.url} href={item.url}>
              <button
                className={`flex min-w-[3.75rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition-all ${
                  active
                    ? "bg-primary/12 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
                data-testid={`nav-mobile-${item.url.slice(1)}`}
              >
                <item.icon className="h-4 w-4" />
                <span className="truncate">{item.title}</span>
              </button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    startAutoSnapshots();
  }, []);

  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3.25rem",
  };

  const pageMeta = useMemo(() => {
    if (location.startsWith("/subjects/")) {
      return { title: t.nav.subjects, subtitle: t.dashboard.todaysPlan };
    }

    const items = [
      { url: "/dashboard", title: t.nav.home, subtitle: t.app.tagline },
      { url: "/subjects", title: t.nav.subjects, subtitle: t.subjects.title },
      { url: "/planner", title: t.nav.planner, subtitle: t.planner.title },
      { url: "/focus", title: t.nav.focus, subtitle: t.focus.title },
      { url: "/ai", title: t.nav.ai, subtitle: t.ai.title },
      { url: "/progress", title: t.nav.progress, subtitle: t.progress.title },
      { url: "/friends", title: t.nav.friends, subtitle: t.friends.title },
      { url: "/chat", title: t.nav.chat, subtitle: t.chat.title },
      { url: "/profile", title: t.nav.profile, subtitle: t.profile.title },
      { url: "/settings", title: t.nav.settings, subtitle: t.settings.title },
    ];

    return items.find((item) => location === item.url || (item.url !== "/dashboard" && location.startsWith(item.url)))
      || { title: t.app.name, subtitle: t.app.tagline };
  }, [location, t]);

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border/70 bg-background/72 backdrop-blur-xl">
            <div className="app-page flex items-center justify-between gap-3 py-4 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger
                  data-testid="button-sidebar-toggle"
                  className="hidden rounded-2xl border border-border/70 bg-card/85 shadow-sm md:flex"
                />
                <div className="flex md:hidden items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="app-kicker hidden sm:inline-flex">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {pageMeta.title}
                  </div>
                  <p className="mt-0 text-lg font-semibold tracking-tight sm:mt-2 sm:text-2xl">{pageMeta.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{pageMeta.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden rounded-2xl border border-border/70 bg-card/85 px-3 py-2 text-right shadow-sm sm:block">
                  <p className="text-xs font-semibold text-foreground">{user?.fullName?.split(" ")[0] || t.app.name}</p>
                  <p className="text-[11px] text-muted-foreground">{language === "en" ? "English" : "Bangla"}</p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-2xl bg-card/85 shadow-sm"
                  onClick={() => setLanguage(language === "en" ? "bn" : "en")}
                  data-testid="button-language-toggle"
                >
                  <Languages className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-2xl bg-card/85 shadow-sm"
                  onClick={toggleTheme}
                  data-testid="button-theme-toggle"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </header>
          <main className="app-shell-main">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
      <AIWidget />
    </SidebarProvider>
  );
}


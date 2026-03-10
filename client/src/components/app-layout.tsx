import { useEffect } from "react";
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
} from "lucide-react";

function AppSidebar() {
  const { t } = useLanguage();
  const { logout } = useAuth();
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
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-base">{t.app.name}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild data-active={location === item.url}>
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t md:hidden">
      <nav className="flex items-center justify-around h-14">
        {items.map((item) => (
          <Link key={item.url} href={item.url}>
            <button
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-md transition-colors ${
                location === item.url ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid={`nav-mobile-${item.url.slice(1)}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.title}</span>
            </button>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    startAutoSnapshots();
  }, []);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-1 p-2 border-b sticky top-0 z-40 bg-background/80 backdrop-blur-md">
            <div className="flex items-center gap-1">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="hidden md:flex" />
              <div className="flex md:hidden items-center gap-2 pl-2">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-sm">Study Orbit</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setLanguage(language === "en" ? "bn" : "en")}
                data-testid="button-language-toggle"
              >
                <Languages className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
      <AIWidget />
    </SidebarProvider>
  );
}

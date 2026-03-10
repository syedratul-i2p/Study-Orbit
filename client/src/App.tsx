import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { LanguageProvider } from "@/lib/languageContext";
import { AuthProvider, useAuth } from "@/lib/auth";
import AppLayout from "@/components/app-layout";
import LandingPage from "@/pages/landing";
import { LoginPage, RegisterPage, ForgotPasswordPage } from "@/pages/auth";
import OnboardingPage from "@/pages/onboarding";
import DashboardPage from "@/pages/dashboard";
import SubjectsPage from "@/pages/subjects";
import SubjectDetailPage from "@/pages/subject-detail";
import PlannerPage from "@/pages/planner";
import FocusPage from "@/pages/focus";
import AIAssistantPage from "@/pages/ai-assistant";
import ProgressPage from "@/pages/progress";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import FriendsPage from "@/pages/friends";
import ChatPage from "@/pages/chat";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

function AuthenticatedRoutes() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    const publicPaths = ["/", "/login", "/register", "/forgot-password"];
    if (!user) {
      if (!publicPaths.includes(location)) {
        navigate("/login");
      }
    } else if (!user.onboardingComplete) {
      if (location !== "/onboarding") {
        navigate("/onboarding");
      }
    } else if (publicPaths.includes(location)) {
      navigate("/dashboard");
    }
  }, [user, isLoading, location, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/dashboard">
        <AppLayout><DashboardPage /></AppLayout>
      </Route>
      <Route path="/subjects">
        <AppLayout><SubjectsPage /></AppLayout>
      </Route>
      <Route path="/subjects/:id">
        <AppLayout><SubjectDetailPage /></AppLayout>
      </Route>
      <Route path="/planner">
        <AppLayout><PlannerPage /></AppLayout>
      </Route>
      <Route path="/focus">
        <AppLayout><FocusPage /></AppLayout>
      </Route>
      <Route path="/ai">
        <AppLayout><AIAssistantPage /></AppLayout>
      </Route>
      <Route path="/progress">
        <AppLayout><ProgressPage /></AppLayout>
      </Route>
      <Route path="/profile">
        <AppLayout><ProfilePage /></AppLayout>
      </Route>
      <Route path="/settings">
        <AppLayout><SettingsPage /></AppLayout>
      </Route>
      <Route path="/friends">
        <AppLayout><FriendsPage /></AppLayout>
      </Route>
      <Route path="/chat">
        <AppLayout><ChatPage /></AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <AuthenticatedRoutes />
            </AuthProvider>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

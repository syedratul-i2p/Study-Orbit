import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { useLanguage } from "@/lib/languageContext";
import { AlertCircle, ArrowLeft, GraduationCap, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(13,148,136,0.08),transparent_30%)] px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl items-center justify-center">
        <div className="app-surface w-full max-w-2xl p-8 sm:p-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            {t.notFound.badge}
          </div>
          <EmptyState
            className="border-0 bg-transparent px-0 py-2 shadow-none"
            icon={<GraduationCap className="h-8 w-8 text-primary" />}
            title={
              <>
                <span className="text-4xl font-bold tracking-tight sm:text-5xl">404</span>
                <span className="mt-3 block text-xl font-semibold tracking-tight">{t.notFound.title}</span>
              </>
            }
            description={t.notFound.description}
            action={
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                <Button onClick={() => navigate("/")} className="rounded-2xl px-5">
                  <Home className="mr-2 h-4 w-4" />
                  {t.notFound.home}
                </Button>
                <Button variant="outline" onClick={() => window.history.back()} className="rounded-2xl px-5">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t.notFound.back}
                </Button>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}

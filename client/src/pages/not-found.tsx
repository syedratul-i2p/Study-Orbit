import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, GraduationCap, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(13,148,136,0.08),transparent_30%)] px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl items-center justify-center">
        <Card className="app-surface w-full max-w-2xl p-8 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xl shadow-indigo-500/20">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              Missing page
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">404</h1>
            <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">This page drifted out of orbit.</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              The route exists in neither the public experience nor the authenticated study workspace. Use one of the links below to recover.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => navigate("/")} className="rounded-2xl px-5">
                <Home className="mr-2 h-4 w-4" />
                Go to home
              </Button>
              <Button variant="outline" onClick={() => window.history.back()} className="rounded-2xl px-5">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go back
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

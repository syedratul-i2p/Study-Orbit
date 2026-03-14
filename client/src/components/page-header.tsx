import type { ReactNode } from "react";

type PageHeaderProps = {
  badge?: ReactNode;
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export function PageHeader({
  badge,
  icon,
  title,
  description,
  children,
  className = "",
}: PageHeaderProps) {
  return (
    <section className={`app-surface overflow-hidden ${className}`.trim()}>
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-36 rounded-[1.75rem] bg-gradient-to-r from-primary/12 via-primary/6 to-transparent" />
          <div className="relative space-y-4">
            {badge ? <div className="app-kicker">{badge}</div> : null}
            <div className="flex items-start gap-4">
              {icon ? (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary shadow-sm">
                  {icon}
                </div>
              ) : null}
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                {description ? (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-end">{children}</div>
      </div>
    </section>
  );
}

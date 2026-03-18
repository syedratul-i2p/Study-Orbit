import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { normalizeAIContent } from "@/lib/ai-format";

type AIMarkdownVariant = "widget" | "page";

const variantClasses: Record<AIMarkdownVariant, string> = {
  widget:
    "prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_p]:text-xs [&_p]:leading-relaxed [&_li]:text-xs [&_li]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/50 [&_pre]:bg-background/80 [&_pre]:p-2 [&_code]:rounded-md [&_code]:bg-background/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[11px] [&_code]:font-medium [&_table]:min-w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border/60 [&_th]:bg-muted/60 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-border/40 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_th]:align-top [&_strong]:font-semibold [&_em]:italic",
  page:
    "prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:text-[13px] [&_p]:leading-relaxed [&_li]:text-[13px] [&_li]:leading-relaxed [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/50 [&_pre]:bg-background/80 [&_pre]:p-3 [&_code]:rounded-md [&_code]:bg-background/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12px] [&_code]:font-medium [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h3]:font-semibold [&_table]:min-w-full [&_table]:border-collapse [&_table]:text-xs [&_th]:border [&_th]:border-border/60 [&_th]:bg-muted/60 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_td]:border [&_td]:border-border/40 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top [&_th]:align-top [&_blockquote]:border-l-primary/30 [&_blockquote]:text-muted-foreground [&_strong]:font-semibold [&_em]:italic",
};

export function AIMarkdown({
  content,
  variant = "page",
  className,
}: {
  content: string;
  variant?: AIMarkdownVariant;
  className?: string;
}) {
  return (
    <div className={cn(variantClasses[variant], className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ className: tableClassName, ...props }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border/40">
              <table className={cn("w-full bg-background/30", tableClassName)} {...props} />
            </div>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const value = String(children).replace(/\n$/, "");
            const isBlock = value.includes("\n") || (codeClassName?.includes("language-") ?? false);

            if (isBlock) {
              return (
                <code className={cn("font-medium", codeClassName)} {...props}>
                  {value}
                </code>
              );
            }

            return (
              <code className={cn("font-medium text-foreground", codeClassName)} {...props}>
                {value}
              </code>
            );
          },
        }}
      >
        {normalizeAIContent(content)}
      </ReactMarkdown>
    </div>
  );
}

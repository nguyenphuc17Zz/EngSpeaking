import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface ThinkingIndicatorProps {
  label?: string;
  className?: string;
}

export function ThinkingIndicator({
  label = "AI đang suy nghĩ...",
  className,
}: ThinkingIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-primary/10 border border-primary/25 text-primary text-xs font-semibold backdrop-blur-md shadow-xs animate-in fade-in duration-200",
        className
      )}
    >
      <Sparkles className="size-3.5 animate-pulse text-primary" />
      <span>{label}</span>

      {/* 3 Bouncing Dots */}
      <div className="flex items-center gap-1 pl-0.5">
        <span className="size-1.5 rounded-full bg-primary animate-typing-dot-1" />
        <span className="size-1.5 rounded-full bg-primary animate-typing-dot-2" />
        <span className="size-1.5 rounded-full bg-primary animate-typing-dot-3" />
      </div>
    </div>
  );
}

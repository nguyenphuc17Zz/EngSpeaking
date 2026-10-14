import React from "react";
import { cn } from "@/lib/utils";

interface EngSpeakLogoProps {
  className?: string;
  size?: number;
  priority?: boolean;
}

export function EngSpeakLogo({
  className,
  size = 34,
}: EngSpeakLogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative flex items-center justify-center shrink-0 rounded-none border-2 border-border bg-foreground text-background font-mono font-black text-xs tracking-tighter shadow-[2px_2px_0px_var(--primary)] transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 select-none",
        className
      )}
    >
      <span>&gt;_</span>
      <span className="absolute -bottom-0.5 -right-0.5 size-2 bg-primary border border-border" />
    </div>
  );
}

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface EngSpeakLogoProps {
  className?: string;
  size?: number;
  priority?: boolean;
}

export function EngSpeakLogo({
  className,
  size = 36,
  priority = true,
}: EngSpeakLogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-sm ring-1 ring-cyan-500/20 bg-slate-950 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_16px_rgba(56,189,248,0.35)]",
        className
      )}
    >
      <Image
        src="/icon.png"
        alt="EngSpeak Logo"
        width={size}
        height={size}
        priority={priority}
        className="w-full h-full object-cover select-none"
      />
    </div>
  );
}

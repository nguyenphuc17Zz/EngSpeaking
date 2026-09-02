import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-shimmer rounded-xl bg-muted/60", className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-4 shadow-xs">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-7 w-20 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}

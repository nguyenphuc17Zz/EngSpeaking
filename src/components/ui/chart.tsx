"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function ChartContainer({ className, children, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("w-full h-[250px]", className)} {...props}>{children}</div>;
}

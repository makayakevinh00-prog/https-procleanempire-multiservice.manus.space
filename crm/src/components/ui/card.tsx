import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-2xl border border-slate-200/70 bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.05),0_6px_20px_rgba(15,23,42,0.04)]", className)} {...p} />
);
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-base font-bold text-slate-900", className)} {...p} />
);
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6", className)} {...p} />
);

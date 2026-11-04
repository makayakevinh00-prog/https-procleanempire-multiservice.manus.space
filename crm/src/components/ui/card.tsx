import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-xl border border-slate-200/80 bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06),0_4px_14px_rgba(15,23,42,0.05)]", className)} {...p} />
);
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-[15px] font-bold text-slate-900", className)} {...p} />
);
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5", className)} {...p} />
);

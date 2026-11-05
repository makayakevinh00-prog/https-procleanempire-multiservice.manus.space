import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto">
    <table className={cn("w-full text-[15px]", className)} {...p} />
  </div>
);
export const Th = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("whitespace-nowrap bg-slate-50/80 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 first:rounded-tl-none", className)} {...p} />
);
export const Td = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-5 py-4 align-middle", className)} {...p} />
);
export const Tr = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-t border-slate-100 transition-colors first:border-t-0 hover:bg-sky-50/50", className)} {...p} />
);

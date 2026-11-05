import { Inbox } from "lucide-react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-[15px] text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/** État vide : un message clair, éventuellement une action pour démarrer. */
export function Empty({ children, action, icon: Icon = Inbox }: { children: React.ReactNode; action?: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Icon className="h-7 w-7" /></span>
      <p className="max-w-md text-[15px] text-slate-500">{children}</p>
      {action}
    </div>
  );
}

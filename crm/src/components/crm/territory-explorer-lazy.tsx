"use client";
import dynamic from "next/dynamic";

export const TerritoryExplorerLazy = dynamic(() => import("./territory-explorer").then((m) => m.TerritoryExplorer), { ssr: false, loading: () => <div className="h-[620px] animate-pulse rounded-xl bg-slate-100" /> });

"use client";

import dynamic from "next/dynamic";
export const SiteMapLazy = dynamic(() => import("./site-map").then((m) => m.SiteMap), { ssr: false, loading: () => <div className="h-[360px] animate-pulse rounded-xl bg-slate-100" /> });

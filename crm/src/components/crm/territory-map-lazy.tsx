"use client";
import dynamic from "next/dynamic";

export const TerritoryMapLazy = dynamic(() => import("./territory-map").then((m) => m.TerritoryMap), { ssr: false, loading: () => <div className="h-[560px] animate-pulse rounded-xl bg-slate-100" /> });

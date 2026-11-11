"use client";
import dynamic from "next/dynamic";

export const LiveMapLazy = dynamic(() => import("./live-map").then((m) => m.LiveMap), { ssr: false, loading: () => <div className="h-[520px] animate-pulse rounded-xl bg-slate-100" /> });

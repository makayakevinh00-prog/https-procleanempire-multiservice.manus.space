"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FlashInner() {
  const sp = useSearchParams();
  const error = sp.get("error");
  const ok = sp.get("ok");
  if (!error && !ok) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-4 rounded-md border px-4 py-3 text-sm ${error ? "border-red-300 bg-red-50 text-red-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}
    >
      {error ?? ok}
    </div>
  );
}

export const Flash = () => <Suspense><FlashInner /></Suspense>;

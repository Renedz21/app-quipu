"use client";

import Link from "next/link";
import { ArrowLeft } from "reicon-react/icons/ArrowLeft";
import { INCOME_PAGE_TITLE } from "../constants";

export function IncomeRegisterMobileHeader() {
  return (
    <div className="fixed inset-x-0 top-0 z-30 flex h-[calc(52px+env(safe-area-inset-top))] items-end border-b border-line bg-canvas/95 px-4 pb-3 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-[13.5px] text-mute hover:text-ink"
        aria-label="Volver al inicio"
      >
        <ArrowLeft size={16} aria-hidden />
        Volver
      </Link>
      <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-serif text-[17px] font-medium text-ink">
        {INCOME_PAGE_TITLE}
      </span>
    </div>
  );
}

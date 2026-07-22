"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getInitial } from "@/modules/dashboard/lib/dashboard-math";
import { AppNavIcon } from "@/shared/components/app-nav-icon";
import { QuipuLogo } from "@/shared/components/quipu-logo";
import { SIDEBAR_ITEMS } from "@/shared/constants/navigation";
import { PLAN_LABELS } from "@/shared/constants/plan";
import { cn } from "@/shared/lib/utils";

type Props = {
  profileName?: string;
  plan?: "free" | "premium";
  className?: string;
};

function navItemActive(pathname: string, href: string) {
  if (href === "/settings") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === "/income/register") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href;
}

export function AppSidebar({ profileName, plan = "free", className }: Props) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex h-full w-[228px] flex-col border-r border-line px-4 py-6",
        className,
      )}
    >
      <QuipuLogo className="mb-7 px-2" />

      <nav className="flex flex-col gap-1">
        {SIDEBAR_ITEMS.map((item) => {
          const active = !item.disabled && navItemActive(pathname, item.href);
          const content = (
            <>
              <AppNavIcon label={item.label} active={active} />
              <span>{item.label}</span>
            </>
          );

          const itemClassName = cn(
            "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors",
            active
              ? "bg-qp-selected font-semibold text-ink"
              : "text-ink-secondary hover:bg-qp-soft",
            item.disabled && "cursor-not-allowed opacity-70",
          );

          if (item.disabled) {
            return (
              <span key={item.label} className={itemClassName} aria-disabled>
                {content}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={itemClassName}
              aria-current={active ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line-divider pt-3">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-qp-soft font-serif text-base text-qp-deep">
            {getInitial(profileName ?? "Quipu")}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13.5px] font-semibold text-ink">
              {profileName ?? "Quipu"}
            </div>
            <div className="truncate text-[11.5px] text-mute">
              {PLAN_LABELS[plan]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

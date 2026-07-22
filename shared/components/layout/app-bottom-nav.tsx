"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppNavIcon } from "@/shared/components/app-nav-icon";
import { BOTTOM_NAV_ITEMS } from "@/shared/constants/navigation";
import { cn } from "@/shared/lib/utils";
import { DashboardFab } from "./dashboard-fab";

type Props = {
  className?: string;
};

function navItemActive(pathname: string, href: string) {
  if (href === "/settings") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href;
}

export function AppBottomNav({ className }: Props) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "relative border-t border-line bg-[color-mix(in_oklch,var(--qp-canvas)_94%,transparent)] px-5 pb-[max(env(safe-area-inset-bottom),10px)] pt-3 backdrop-blur-md",
        className,
      )}
    >
      <div className="grid grid-cols-5 items-start">
        {BOTTOM_NAV_ITEMS.slice(0, 2).map((item) => {
          const active = !item.disabled && navItemActive(pathname, item.href);
          const content = (
            <>
              <AppNavIcon label={item.label} active={active} size={24} />
              <span className={cn(active && "font-semibold text-qp-deep")}>
                {item.label}
              </span>
            </>
          );

          const itemClassName = cn(
            "flex flex-col items-center gap-1 text-[9.5px] text-mute",
            active && "text-qp-deep",
            item.disabled && "opacity-70",
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

        <div className="-mt-3.5 flex justify-center">
          <DashboardFab />
        </div>

        {BOTTOM_NAV_ITEMS.slice(2).map((item) => {
          const active = !item.disabled && navItemActive(pathname, item.href);
          const content = (
            <>
              <AppNavIcon label={item.label} active={active} size={18} />
              <span className={cn(active && "font-semibold text-qp-deep")}>
                {item.label}
              </span>
            </>
          );

          const itemClassName = cn(
            "flex flex-col items-center gap-1 text-[9.5px] text-mute",
            active && "text-qp-deep",
            item.disabled && "opacity-70",
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
      </div>
    </div>
  );
}

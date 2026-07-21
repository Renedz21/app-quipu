"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_ITEMS } from "@/modules/dashboard/constants";
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

function BottomNavIcon({ label, active }: { label: string; active: boolean }) {
  const color = active ? "border-qp-deep" : "border-mute";

  switch (label) {
    case "Inicio":
      return (
        <span
          className={cn("size-[17px] rounded-[5px] border-[1.8px]", color)}
        />
      );
    case "Ahorros":
      return (
        <span className={cn("size-4 rounded-full border-[1.8px]", color)} />
      );
    case "Compromisos":
      return <span className={cn("size-4 rounded border-[1.8px]", color)} />;
    case "Ajustes":
      return (
        <span
          className={cn(
            "flex size-4 items-center justify-center rounded-full border-[1.8px]",
            color,
          )}
        >
          <span
            className={cn(
              "size-1 rounded-full",
              active ? "bg-qp-deep" : "bg-mute",
            )}
          />
        </span>
      );
    default:
      return (
        <span
          className={cn(
            "flex size-4 items-center justify-center rounded-full border-[1.8px]",
            color,
          )}
        >
          <span
            className={cn(
              "size-1 rounded-full",
              active ? "bg-qp-deep" : "bg-mute",
            )}
          />
        </span>
      );
  }
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
              <BottomNavIcon label={item.label} active={active} />
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
              <BottomNavIcon label={item.label} active={active} />
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

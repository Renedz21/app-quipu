"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLAN_LABELS, SIDEBAR_ITEMS } from "@/modules/dashboard/constants";
import { getInitial } from "@/modules/dashboard/lib/dashboard-math";
import { QuipuLogo } from "@/shared/components/quipu-logo";
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
  return pathname === href;
}

function SidebarIcon({ label }: { label: string }) {
  switch (label) {
    case "Inicio":
      return (
        <span className="size-4 rounded-[5px] border-[1.7px] border-qp-deep" />
      );
    case "Registrar":
      return (
        <span className="relative size-4">
          <span className="absolute top-[7px] left-px h-0.5 w-3.5 rounded-sm bg-mute" />
          <span className="absolute top-px left-[7px] h-3.5 w-0.5 rounded-sm bg-mute" />
        </span>
      );
    case "Ahorros":
      return (
        <span className="size-[15px] rounded-full border-[1.7px] border-mute" />
      );
    case "Compromisos":
      return (
        <span className="relative size-[15px] rounded border-[1.7px] border-mute">
          <span className="absolute -top-0.5 left-[3px] h-1 w-0.5 rounded-sm bg-mute" />
          <span className="absolute -top-0.5 right-[3px] h-1 w-0.5 rounded-sm bg-mute" />
        </span>
      );
    case "Coach":
      return (
        <span className="size-[15px] rounded-full rounded-bl-[3px] border-[1.7px] border-mute" />
      );
    case "Ajustes":
      return (
        <span className="flex size-[15px] items-center justify-center rounded-full border-[1.7px] border-mute">
          <span className="size-1 rounded-full bg-mute" />
        </span>
      );
    default:
      return (
        <span className="flex size-[15px] items-center justify-center rounded-full border-[1.7px] border-mute">
          <span className="size-1 rounded-full bg-mute" />
        </span>
      );
  }
}

export function AppSidebar({ profileName, plan = "free", className }: Props) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex h-full w-[228px] flex-col border-r border-line bg-qp-sidebar px-4 py-6",
        className,
      )}
    >
      <QuipuLogo className="mb-7 px-2" />

      <nav className="flex flex-col gap-1">
        {SIDEBAR_ITEMS.map((item) => {
          const active = !item.disabled && navItemActive(pathname, item.href);
          const content = (
            <>
              <SidebarIcon label={item.label} />
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

"use client";

import { Add, CalendarCheck, Home, Money, Settings } from "reicon-react";
import { cn } from "@/shared/lib/utils";

type Props = {
  label: string;
  active?: boolean;
  className?: string;
  size?: number;
};

function iconColor(active: boolean | undefined): string {
  return active ? "var(--qp-deep)" : "var(--mute)";
}

export function AppNavIcon({ label, active, className, size = 16 }: Props) {
  const color = iconColor(active);
  const iconProps = {
    size,
    color,
    className: cn("shrink-0", className),
    weight: (active ? "Filled" : "Outline") as "Filled" | "Outline",
  };

  switch (label) {
    case "Inicio":
      return <Home {...iconProps} />;
    case "Registrar":
      return <Add size={size} color={color} className={iconProps.className} />;
    case "Ahorros":
      return <Money {...iconProps} />;
    case "Compromisos":
      return <CalendarCheck {...iconProps} />;
    case "Ajustes":
      return <Settings {...iconProps} />;
    default:
      return (
        <Settings
          size={size}
          color={color}
          className={iconProps.className}
          weight="Outline"
        />
      );
  }
}

import { Check, WifiOff, X } from "lucide-react";
import type { StatusVariant } from "@/modules/auth/types";
import { cn } from "@/shared/lib/utils";

interface StatusIconProps {
  variant: StatusVariant;
  size?: "default" | "sm";
  className?: string;
}

const VARIANT_STYLES: Record<StatusVariant, { bg: string; icon: string }> = {
  success: { bg: "bg-success-soft", icon: "text-success" },
  error: { bg: "bg-destructive-soft", icon: "text-destructive" },
  "verify-error": { bg: "bg-destructive-soft", icon: "text-destructive" },
  "network-error": { bg: "bg-warning-soft", icon: "text-warning" },
  "expired-error": { bg: "bg-destructive-soft", icon: "text-destructive" },
};

const VARIANT_ICONS: Record<
  StatusVariant,
  React.ComponentType<{ className?: string }>
> = {
  success: Check,
  error: X,
  "verify-error": X,
  "network-error": WifiOff,
  "expired-error": X,
};

export function StatusIcon({
  variant,
  size = "default",
  className,
}: StatusIconProps) {
  const styles = VARIANT_STYLES[variant];
  const Icon = VARIANT_ICONS[variant];
  const sizeClass = size === "sm" ? "size-10" : "size-16";
  const iconSize = size === "sm" ? "size-5" : "size-8";
  return (
    <div
      data-slot="status-icon"
      data-variant={variant}
      className={cn(
        "flex items-center justify-center rounded-full motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95",
        sizeClass,
        styles.bg,
        styles.icon,
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={cn(iconSize, styles.icon)} />
    </div>
  );
}

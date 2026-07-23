import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

type Tone = "neutral" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
};

/** Control compacto de pie de Ajustes: contenido intrínseco, sin card. */
export function SettingsAccountActionButton({
  tone = "neutral",
  className,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex w-auto max-w-full items-center rounded-[11px] px-3 py-2 text-left text-[13px] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qp-tint/80 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "disabled:pointer-events-none disabled:opacity-60",
        tone === "neutral" && "text-mute hover:bg-surface-warm hover:text-ink",
        tone === "danger" && "text-danger-ink hover:bg-danger-bg",
        className,
      )}
      {...props}
    />
  );
}

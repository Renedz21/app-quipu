import { cn } from "@quipu/lib"
import type { ComponentProps } from "react"
import { type BadgeVariants, badgeVariants } from "./badge.variants"

export type BadgeProps = ComponentProps<"span"> & BadgeVariants

/**
 * Compact label used to display status, counts, or short tags.
 *
 * Server-renderable — no hooks, no events. Renders a `<span>` by default.
 */
export function Badge({
  className,
  variant = "primary",
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

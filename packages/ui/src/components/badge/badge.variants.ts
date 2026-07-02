import { cva, type VariantProps } from "class-variance-authority"

/**
 * Visual variants for {@link Badge}.
 *
 * Soft variants: each one uses a `-soft` token (a low-saturation background
 * tinted with the semantic color) and a foreground token in the matching hue.
 *
 * NOTE — Theme contract: this component expects the consuming app's Tailwind
 * theme to declare the following tokens in `@theme inline`:
 *   - `--color-primary`              (primary — base hue)
 *   - `--color-primary-soft`         (primary — soft badge bg)
 *   - `--color-primary-foreground`   (primary — soft badge text)
 *   - `--color-success`              (success — base hue)
 *   - `--color-success-soft`         (success — soft badge bg)
 *   - `--color-success-foreground`   (success — soft badge text) [optional]
 *   - `--color-warning`              (warning — base hue)
 *   - `--color-warning-soft`         (warning — soft badge bg)
 *   - `--color-warning-foreground`   (warning — soft badge text) [optional]
 *   - `--color-destructive`          (destructive — base hue)
 *   - `--color-destructive-soft`     (destructive — soft badge bg) [ADD]
 *   - `--color-destructive-foreground` (destructive — soft badge text) [ADD]
 *   - `--color-border`               (outline)
 *   - `--color-ring`                 (focus ring)
 */
export const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1",
    "overflow-hidden rounded-full border border-transparent",
    "px-2.75 py-1.5 text-xs font-semibold whitespace-nowrap",
    "transition-[color,box-shadow]",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        destructive: "bg-destructive-soft text-destructive",
        outline: "text-foreground border-border",
        ghost: "bg-transparent text-faint",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

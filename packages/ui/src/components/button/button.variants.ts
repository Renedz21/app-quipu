import { cva, type VariantProps } from "class-variance-authority"

/**
 * Visual variants for {@link Button}.
 *
 * NOTE — Theme contract: this component expects the consuming app's Tailwind
 * theme to declare the following tokens in `@theme inline`:
 *   - `--color-primary`                  (default, ghost text)
 *   - `--color-primary-foreground`       (default, success — text on colored bg)
 *   - `--color-secondary`                (secondary — surface)
 *   - `--color-secondary-foreground`     (secondary — text on secondary)
 *   - `--color-success`                  (success)
 *   - `--color-destructive`              (destructive)
 *   - `--color-destructive-soft`   (destructive — text on red)
 *   - `--color-border`                   (secondary — outline)
 *   - `--color-ring`                     (focus ring)
 */
export const buttonVariants = cva(
  [
    "group/button",
    "inline-flex shrink-0 items-center justify-center",
    "rounded-lg border border-transparent bg-clip-padding",
    "text-sm font-medium whitespace-nowrap",
    "transition-all outline-none select-none",
    "active:not-aria-[haspopup]:translate-y-px",
    "disabled:pointer-events-none disabled:bg-paper disabled:text-muted/30 disabled:border-transparent",
    "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/50",
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
    "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95",
        secondary:
          "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 active:bg-secondary/90",
        ghost: "bg-transparent text-primary hover:bg-primary-soft",
        success:
          "bg-success text-primary-foreground hover:bg-success/90 active:bg-success/95",
        destructive:
          "bg-destructive text-destructive-soft hover:bg-destructive/90 active:bg-destructive/95",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

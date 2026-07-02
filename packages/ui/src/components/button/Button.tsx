import { cn } from "@quipu/lib"
import { Slot } from "@radix-ui/react-slot"
import type { ComponentProps } from "react"
import { type ButtonVariants, buttonVariants } from "./button.variants"

/**
 * Props for the {@link Button} primitive.
 *
 * When `asChild` is `true`, the Button renders its single child element and
 * forwards every prop (including `className`, event handlers and `ref`) to it.
 * This is the standard pattern for composing Button styling onto interactive
 * primitives like Next's `Link`, Radix's `DialogTrigger`, `DropdownMenuTrigger`,
 * `PopoverAnchor`, etc.
 *
 * The polymorphic typing below makes `href` (and other anchor-only props) only
 * available when `asChild` is true, since the rendered child is the only thing
 * that decides the final element type.
 */
type ButtonProps = ComponentProps<"button"> &
  ButtonVariants & {
    /**
     * When `true`, the Button does not render its own element. Instead, it
     * merges its props, className and ref into its single child — letting you
     * compose Button styling onto any element or component (e.g. `<Link>`,
     * `<DialogTrigger>`, `<DropdownMenuTrigger>`).
     *
     * @default false
     */
    asChild?: boolean
  }

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  // `Slot` merges its props into the child it wraps. It is a zero-runtime
  // abstraction — it just produces the child element with merged props.
  // When `asChild` is false, we render a plain <button> as usual.
  const Comp = asChild ? Slot : "button"

  // `type="button"` is the safe default for <button> — prevents accidental
  // form submits when the Button lives inside a <form> and isn't `submit`.
  // We only set it when rendering a real <button>; for `Slot` the child owns
  // its own type semantics.
  const type = asChild ? undefined : (props.type ?? "button")

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      type={type}
      {...props}
    />
  )
}

export type { ButtonProps }
export { Button }

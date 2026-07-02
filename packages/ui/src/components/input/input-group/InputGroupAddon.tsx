"use client"

import { cn } from "@quipu/lib"
import type { ComponentProps, KeyboardEvent, MouseEvent } from "react"
import {
  type InputGroupAddonVariants,
  inputGroupAddonVariants,
} from "./input-group.variants"

export type InputGroupAddonProps = ComponentProps<"div"> &
  InputGroupAddonVariants

/**
 * Shared focus-the-input behavior. Skips focus when the event originated on a
 * `<button>` child (so the button's own activation logic runs unaltered).
 * Invokes the consumer's handler after the internal logic so they can
 * override or extend behavior.
 *
 * Generic over `HTMLElement` so it works with both the `InputGroupAddon` `<div>`
 * and any other element type the consumer might wrap.
 */
function focusInnerControl(
  e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
) {
  if ((e.target as HTMLElement).closest("button")) return false
  const control = e.currentTarget.parentElement?.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >("input, textarea")
  if (!control) return false
  control.focus()
  return true
}

function InputGroupAddon({
  className,
  align = "inline-start",
  onClick,
  onKeyDown,
  onKeyUp,
  onKeyPress,
  ...props
}: InputGroupAddonProps) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        focusInnerControl(e)
        onClick?.(e)
      }}
      onKeyDown={(e) => {
        focusInnerControl(e)
        onKeyDown?.(e)
      }}
      onKeyUp={(e) => {
        // Don't steal focus on key-up: only key-down models "activation".
        // We still invoke the consumer's handler.
        onKeyUp?.(e)
      }}
      onKeyPress={(e) => {
        // `onKeyPress` is deprecated for non-character keys, but we still
        // wire it for parity with mouse click behavior on older browsers.
        focusInnerControl(e)
        onKeyPress?.(e)
      }}
      {...props}
    />
  )
}

export { InputGroupAddon }

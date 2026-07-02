import { cn } from "@quipu/lib"
import type { ComponentProps } from "react"

export type InputGroupTextProps = ComponentProps<"span">

function InputGroupText({ className, ...props }: InputGroupTextProps) {
  return (
    <span
      data-slot="input-group-text"
      className={cn(
        "flex items-center gap-2 text-sm text-faint [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

export { InputGroupText }

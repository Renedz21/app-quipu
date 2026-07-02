import { cn } from "@quipu/lib"
import { Input } from "../Input"
import type { InputProps } from "../input.variants"

export type InputGroupInputProps = InputProps

/**
 * `<input>` styled to live inside an {@link InputGroup}. The InputGroup
 * handles the outer border and focus ring; this input is borderless and
 * transparent so it visually merges with the group.
 */
function InputGroupInput({ className, ...props }: InputGroupInputProps) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  )
}

export { InputGroupInput }

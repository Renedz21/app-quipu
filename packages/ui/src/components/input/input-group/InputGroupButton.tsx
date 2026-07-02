import { cn } from "@quipu/lib"
import { cva, type VariantProps } from "class-variance-authority"
import { Button, type ButtonProps } from "../../button"

const inputGroupButtonVariants = cva(
  "flex items-center gap-2 text-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-md px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        sm: "",
        "icon-xs": "size-6 rounded-md p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  },
)

type InputGroupButtonVariants = VariantProps<typeof inputGroupButtonVariants>

export type InputGroupButtonProps = Omit<ButtonProps, "size"> &
  InputGroupButtonVariants

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: InputGroupButtonProps) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

export { InputGroupButton, inputGroupButtonVariants }

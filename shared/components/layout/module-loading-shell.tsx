import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

const MAX_WIDTH = {
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  "6xl": "max-w-6xl",
} as const;

type Props = {
  children: ReactNode;
  className?: string;
  maxWidth?: keyof typeof MAX_WIDTH;
};

/** Consistent padding shell for module loading skeletons (espacios pattern). */
export function ModuleLoadingShell({
  children,
  className,
  maxWidth = "2xl",
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 py-6 md:px-0 md:py-8",
        MAX_WIDTH[maxWidth],
        className,
      )}
    >
      {children}
    </div>
  );
}

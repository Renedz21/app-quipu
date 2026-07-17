"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type Props = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export function CheckMark({ size = 12, className, strokeWidth = 3 }: Props) {
  return (
    <Check
      size={size}
      strokeWidth={strokeWidth}
      className={cn("text-primary-foreground", className)}
    />
  );
}

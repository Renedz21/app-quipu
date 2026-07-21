"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { ArrowLeft } from "reicon-react";
import { cn } from "@/shared/lib/utils";

type Props = ComponentProps<typeof Link> & {
  children: React.ReactNode;
};

export function BackLink({ children, className, ...props }: Props) {
  return (
    <Link
      {...props}
      className={cn("inline-flex items-center gap-1", className)}
    >
      <ArrowLeft size={16} color="currentColor" aria-hidden />
      {children}
    </Link>
  );
}

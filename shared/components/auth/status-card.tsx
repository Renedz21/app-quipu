import Link from "next/link";
import type { StatusVariant } from "@/modules/auth/types";
import { buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";
import { StatusIcon } from "./status-icon";

interface ActionConfig {
  label: string;
  href: string;
}

interface StatusCardProps {
  variant: StatusVariant;
  title: string;
  description: string;
  primaryAction?: ActionConfig;
  secondaryAction?: ActionConfig;
}

export function StatusCard({
  variant,
  title,
  description,
  primaryAction,
  secondaryAction,
}: StatusCardProps) {
  return (
    <Card
      data-slot="status-card"
      data-variant={variant}
      className="mx-auto w-full max-w-md"
    >
      <CardHeader className="items-center text-center">
        <StatusIcon variant={variant} />
        <CardTitle className="mt-4 text-xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      {(primaryAction || secondaryAction) && (
        <CardContent className="flex flex-col gap-3">
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className={cn(buttonVariants({ size: "lg" }), "h-12 w-full")}
            >
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-12 w-full",
              )}
            >
              {secondaryAction.label}
            </Link>
          )}
        </CardContent>
      )}
    </Card>
  );
}

"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import { useIsMobile } from "@/shared/hooks/use-mobile";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
};

export function SavingsFormShell({
  open,
  onOpenChange,
  title,
  children,
}: Props) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] rounded-t-[24px] border-line bg-card px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
          <SheetTitle className="mb-4 text-[15px] font-semibold text-ink">
            {title}
          </SheetTitle>
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] gap-0 rounded-[22px] p-0">
        <DialogTitle className="px-5 pt-5 text-[15px] font-semibold text-ink">
          {title}
        </DialogTitle>
        <div className="px-5 pb-5 pt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

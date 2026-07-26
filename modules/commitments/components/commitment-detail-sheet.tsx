"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { fromConvexError } from "@/core/errors";
import { ConfirmDestructiveDialog } from "@/shared/components/confirm-destructive-dialog";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import {
  COMMITMENT_COVERAGE_LABEL,
  COMMITMENT_MARK_PAID,
  COMMITMENT_MARK_PAID_SUCCESS,
  COMMITMENT_NEXT_DUE_LABEL,
  COMMITMENT_PAYMENT_LABEL,
  formatDueInDays,
} from "@/shared/constants/commitments";
import { ENVELOPE_LABELS } from "@/shared/constants/envelopes";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  daysUntilNextDue,
  resolveCommitmentNextDueAt,
} from "@/shared/lib/commitmentDueDate";
import {
  formatCoverageStatusLabel,
  formatPaymentStatusLabel,
} from "@/shared/lib/commitmentStatusDisplay";
import { formatLimaDate } from "@/shared/lib/date";
import { formatCents } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";

type Props = {
  commitmentId: Id<"fixedCommitments"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommitmentDetailSheet({
  commitmentId,
  open,
  onOpenChange,
}: Props) {
  const isMobile = useIsMobile();
  const detail = useQuery(
    api.fixedCommitments.getCommitment,
    commitmentId ? { commitmentId } : "skip",
  );
  const deleteCommitment = useMutation(
    api.fixedCommitments.deleteFixedCommitment,
  );
  const markAsPaid = useMutation(api.fixedCommitments.markCommitmentAsPaid);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  async function handleMarkAsPaid() {
    if (!commitmentId) return;
    setIsMarkingPaid(true);
    try {
      await markAsPaid({ commitmentId });
      toast.success(COMMITMENT_MARK_PAID_SUCCESS);
    } catch (error) {
      toast.error(fromConvexError(error).message);
    } finally {
      setIsMarkingPaid(false);
    }
  }

  async function handleDelete() {
    if (!commitmentId) return;
    setPending(true);
    try {
      await deleteCommitment({ commitmentId });
      toast.success("Compromiso eliminado.");
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(fromConvexError(error).message);
    } finally {
      setPending(false);
    }
  }

  const title = detail?.name ?? "Compromiso";

  const resolvedDue =
    detail != null
      ? (() => {
          const nextDueAt = resolveCommitmentNextDueAt({
            dueDay: detail.dueDay,
            nextDueAt: detail.nextDueAt,
            createdAt: detail.createdAt ?? Date.now(),
          });
          return {
            nextDueAt,
            daysUntilDue:
              detail.daysUntilDue ?? daysUntilNextDue(nextDueAt, Date.now()),
          };
        })()
      : null;

  const body = (
    <>
      {detail === undefined ? (
        <div className="h-24 animate-pulse rounded-xl bg-surface" />
      ) : detail === null ? (
        <p className="text-sm text-mute">No encontramos este compromiso.</p>
      ) : (
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Monto</dt>
            <dd className="font-serif text-lg text-ink">
              {formatCents(detail.amount, {
                currency: detail.currencyCode,
              })}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Sobre</dt>
            <dd className="font-medium text-ink">
              {ENVELOPE_LABELS[detail.envelope]}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">{COMMITMENT_NEXT_DUE_LABEL}</dt>
            <dd className="text-right font-medium text-ink">
              <div>{formatLimaDate(resolvedDue!.nextDueAt)}</div>
              {detail.paymentStatus !== "paid" ? (
                <div className="text-xs font-normal text-mute">
                  {formatDueInDays(resolvedDue!.daysUntilDue)}
                </div>
              ) : null}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">{COMMITMENT_COVERAGE_LABEL}</dt>
            <dd className="font-medium text-ink">
              {formatCoverageStatusLabel(detail.coverageStatus)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">{COMMITMENT_PAYMENT_LABEL}</dt>
            <dd
              className={cn(
                "font-medium",
                detail.paymentStatus === "paid"
                  ? "text-qp-deep"
                  : detail.paymentStatus === "overdue"
                    ? "text-danger-ink"
                    : "text-ink",
              )}
            >
              {formatPaymentStatusLabel(
                detail.paymentStatus,
                detail.paidAtForCycle,
                resolvedDue!.daysUntilDue,
              )}
            </dd>
          </div>
        </dl>
      )}
      {detail ? (
        <div className="mt-6 space-y-2.5">
          {detail.hasActiveCycle && detail.paymentStatus !== "paid" ? (
            <Button
              type="button"
              disabled={isMarkingPaid}
              onClick={() => void handleMarkAsPaid()}
              className="h-12 w-full rounded-[12px] bg-ink text-[15px] font-semibold text-canvas hover:bg-ink/90"
            >
              {isMarkingPaid ? "Guardando…" : COMMITMENT_MARK_PAID}
            </Button>
          ) : null}
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-12 w-full border-danger-line text-danger-ink hover:bg-danger-banner",
            )}
            onClick={() => setConfirmOpen(true)}
          >
            Eliminar compromiso
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            showCloseButton
            className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-[24px] border-line bg-card px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3"
          >
            <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-line" />
            <SheetTitle className="mb-4 shrink-0 pr-8 font-serif text-xl text-ink">
              {title}
            </SheetTitle>
            {body}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-[400px] gap-0 rounded-[22px] border-line bg-card p-0">
            <DialogTitle className="px-5 pt-5 pr-12 font-serif text-xl text-ink">
              {title}
            </DialogTitle>
            <div className="px-5 pb-5 pt-4">{body}</div>
          </DialogContent>
        </Dialog>
      )}
      <ConfirmDestructiveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar este compromiso?"
        description="Se quitará de tu ciclo. Los ingresos ya registrados no cambian."
        confirmLabel="Eliminar"
        pending={pending}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}

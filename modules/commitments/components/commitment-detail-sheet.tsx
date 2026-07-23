"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { fromConvexError } from "@/core/errors";
import { ConfirmDestructiveDialog } from "@/shared/components/confirm-destructive-dialog";
import { buttonVariants } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { ENVELOPE_LABELS } from "@/shared/constants/envelopes";
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
  const detail = useQuery(
    api.fixedCommitments.getCommitment,
    commitmentId ? { commitmentId } : "skip",
  );
  const deleteCommitment = useMutation(
    api.fixedCommitments.deleteFixedCommitment,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-serif text-xl">
              {detail?.name ?? "Compromiso"}
            </SheetTitle>
          </SheetHeader>
          {detail === undefined ? (
            <div className="mt-4 h-24 animate-pulse rounded-xl bg-surface" />
          ) : detail === null ? (
            <p className="mt-4 text-sm text-mute">
              No encontramos este compromiso.
            </p>
          ) : (
            <dl className="mt-4 space-y-3 text-sm">
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
                <dt className="text-mute">Vencimiento</dt>
                <dd className="font-medium text-ink">Día {detail.dueDay}</dd>
              </div>
              {detail.coveredAt ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-mute">Cubierto</dt>
                  <dd className="text-qp-deep">Sí</dd>
                </div>
              ) : null}
            </dl>
          )}
          {detail ? (
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mt-6 w-full border-danger-line text-danger-ink hover:bg-danger-banner",
              )}
              onClick={() => setConfirmOpen(true)}
            >
              Eliminar compromiso
            </button>
          ) : null}
        </SheetContent>
      </Sheet>
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

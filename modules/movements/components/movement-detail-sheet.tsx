"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { Edit, Trash } from "reicon-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { fromConvexError } from "@/core/errors";
import type { IncomeSource } from "@/modules/income/types";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import { ENVELOPE_LABELS } from "@/shared/constants/envelopes";
import { formatLimaDateTime } from "@/shared/lib/date";
import { formatCents } from "@/shared/lib/money";
import { ExpenseEditForm } from "./expense-edit-form";
import { IncomeEditForm } from "./income-edit-form";

type EnvelopeType = "needs" | "wants";

export type MovementForDetail = {
  id: string;
  kind: "expense" | "income";
  label: string;
  amount: number;
  timestamp: number;
  isExtraordinaryIncome?: boolean;
  // Expense fields
  envelopeType?: EnvelopeType;
  // Income fields
  occurredAt?: number;
  source?: IncomeSource;
  incomeKind?: "habitual" | "extraordinary";
  extraordinaryType?: string;
  extraordinaryLabel?: string;
};

type SheetState =
  | "detail"
  | "edit-expense"
  | "edit-income"
  | "confirm-delete"
  | "success";

const SHEET_TITLES: Record<SheetState, string> = {
  detail: "Detalle del movimiento",
  "edit-expense": "Editar gasto",
  "edit-income": "Editar ingreso",
  "confirm-delete": "Eliminar movimiento",
  success: "Movimiento actualizado",
};

const ENVELOPE_DOT: Record<EnvelopeType, string> = {
  needs: "bg-steel",
  wants: "bg-clay",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: MovementForDetail | null;
  currencyCode?: string;
};

export function MovementDetailSheet({
  open,
  onOpenChange,
  movement,
  currencyCode = DEFAULT_CURRENCY.code,
}: Props) {
  const [state, setState] = useState<SheetState>("detail");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteExpense = useMutation(api.expenses.deleteExpense);
  const deleteIncomeEvent = useMutation(api.incomeEvents.deleteIncomeEvent);
  const updateExpense = useMutation(api.expenses.updateExpense);
  const updateIncomeEvent = useMutation(api.incomeEvents.updateIncomeEvent);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setState("detail");
      setDeleteError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleDelete() {
    if (!movement) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (movement.kind === "expense") {
        await deleteExpense({ expenseId: movement.id as Id<"expenses"> });
      } else {
        await deleteIncomeEvent({ eventId: movement.id as Id<"incomeEvents"> });
      }
      onOpenChange(false);
    } catch (error) {
      setDeleteError(fromConvexError(error).message);
    } finally {
      setIsDeleting(false);
    }
  }

  function renderContent() {
    if (!movement) return null;
    const isIncome = movement.kind === "income";

    if (state === "success") {
      return (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-qp shadow-glow">
            <svg
              viewBox="0 0 24 24"
              className="size-8 text-canvas"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              role="presentation"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="mt-4 font-serif text-[22px] font-medium text-ink">
            Listo
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mute">
            Corregimos el registro. Tus sobres se actualizaron.
          </p>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-6 h-12 w-full rounded-[12px] bg-ink text-[15px] font-semibold text-canvas hover:bg-ink/90"
          >
            Cerrar
          </Button>
        </div>
      );
    }

    if (state === "confirm-delete") {
      return (
        <div className="space-y-4">
          <div className="rounded-[13px] border border-danger-line bg-danger-bg px-4 py-4">
            <p className="text-[13.5px] font-semibold text-danger-ink">
              ¿Eliminar {isIncome ? "este ingreso" : "este gasto"}?
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-danger-text">
              Esta acción no se puede deshacer. Los sobres de tu ciclo se
              recalcularán automáticamente.
            </p>
          </div>
          {deleteError ? (
            <p className="text-sm text-danger" role="alert">
              {deleteError}
            </p>
          ) : null}
          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => {
                setState("detail");
                setDeleteError(null);
              }}
              className="h-12 flex-1 rounded-[12px] border-line text-[14.5px] font-semibold text-mute"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="h-12 flex-1 rounded-[12px] bg-[#B0685A] text-[15px] font-semibold text-[#FBFAF7] hover:bg-[#9A5347]"
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </div>
        </div>
      );
    }

    if (state === "edit-expense" && movement.kind === "expense") {
      return (
        <ExpenseEditForm
          expenseId={movement.id}
          initialAmountCents={movement.amount}
          initialDescription={movement.label}
          initialEnvelopeType={movement.envelopeType ?? "wants"}
          currencyCode={currencyCode}
          updateExpense={async (args) =>
            updateExpense({
              expenseId: args.expenseId as Id<"expenses">,
              amount: args.amount,
              description: args.description,
              envelopeType: args.envelopeType,
            })
          }
          onSuccess={() => setState("success")}
          onCancel={() => setState("detail")}
        />
      );
    }

    if (
      state === "edit-income" &&
      movement.kind === "income" &&
      movement.source &&
      movement.occurredAt !== undefined
    ) {
      return (
        <IncomeEditForm
          eventId={movement.id}
          initialAmountCents={movement.amount}
          initialSource={movement.source}
          initialDescription={movement.label}
          initialOccurredAt={movement.occurredAt}
          currencyCode={currencyCode}
          updateIncomeEvent={async (args) =>
            updateIncomeEvent({
              eventId: args.eventId as Id<"incomeEvents">,
              amount: args.amount,
              source: args.source,
              description: args.description,
              occurredAt: args.occurredAt,
              incomeKind: args.incomeKind,
            })
          }
          onSuccess={() => setState("success")}
          onCancel={() => setState("detail")}
        />
      );
    }

    // Default: detail view
    const displayTimestamp =
      movement.kind === "income"
        ? (movement.occurredAt ?? movement.timestamp)
        : movement.timestamp;
    const envelopeType =
      movement.kind === "expense" ? movement.envelopeType : undefined;

    return (
      <div className="space-y-5">
        <div className="rounded-[13px] border border-line bg-surface-soft px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-mute">
                {isIncome ? "Ingreso" : "Gasto"}
                {envelopeType ? ` · ${ENVELOPE_LABELS[envelopeType]}` : ""}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-ink">
                {movement.label}
              </p>
              <p className="mt-1 text-[12px] text-mute">
                {formatLimaDateTime(displayTimestamp)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`font-serif text-[20px] font-medium ${
                  isIncome ? "text-qp-deep" : "text-ink"
                }`}
              >
                {isIncome ? "+" : "−"}{" "}
                {formatCents(movement.amount, { currency: currencyCode })}
              </span>
              {envelopeType ? (
                <span
                  className={`size-2.5 rounded-full ${ENVELOPE_DOT[envelopeType]}`}
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        </div>

        <p className="text-center font-serif text-[18px] text-ink">
          ¿Qué corregimos de este movimiento?
        </p>

        <div className="space-y-2.5">
          <Button
            type="button"
            onClick={() => setState(isIncome ? "edit-income" : "edit-expense")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-ink text-[15px] font-semibold text-canvas hover:bg-ink/90"
          >
            <Edit size={16} color="currentColor" aria-hidden />
            Editar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setState("confirm-delete")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border-danger-line text-[14.5px] font-semibold text-danger-ink hover:bg-danger-bg"
          >
            <Trash size={16} color="currentColor" aria-hidden />
            Eliminar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-[24px] border-line bg-card px-5 pb-0 pt-3"
      >
        <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-line" />
        <SheetTitle className="mb-4 shrink-0 pr-8 text-[15px] font-semibold text-ink">
          {SHEET_TITLES[state]}
        </SheetTitle>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),20px)]">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}

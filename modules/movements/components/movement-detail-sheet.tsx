"use client";

import { useMutation } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { Edit } from "reicon-react/icons/Edit";
import { Trash } from "reicon-react/icons/Trash";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AnalyticsEvents, track } from "@/core/analytics";
import { DEFAULT_CURRENCY } from "@/core/constants";
import { fromConvexError } from "@/core/errors";
import type { IncomeSource } from "@/modules/income/types";
import { AnimatedView } from "@/shared/components/ui/animated-view";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/shared/components/ui/sheet";
import { ENVELOPE_LABELS } from "@/shared/constants/envelopes";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { formatLimaDateTime } from "@/shared/lib/date";
import { formatCents } from "@/shared/lib/money";
import {
  movementAmountClassName,
  movementAmountPrefix,
} from "@/shared/lib/movement-amount-display";
import { ExpenseEditForm } from "./expense-edit-form";
import { IncomeEditForm } from "./income-edit-form";

type EnvelopeType = "needs" | "wants";

export type MovementForDetail = {
  id: string;
  kind: "expense" | "income" | "contribution";
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

async function runDeleteWithBusyFlag(
  setBusy: (busy: boolean) => void,
  run: () => Promise<unknown>,
): Promise<string | null> {
  setBusy(true);
  try {
    await run();
    return null;
  } catch (error) {
    return fromConvexError(error).message;
  } finally {
    setBusy(false);
  }
}

export function MovementDetailSheet({
  open,
  onOpenChange,
  movement,
  currencyCode = DEFAULT_CURRENCY.code,
}: Props) {
  const isMobile = useIsMobile();
  const [state, setState] = useState<SheetState>("detail");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function goTo(
    next: SheetState,
    nextDirection: "forward" | "back" = "forward",
  ) {
    setDirection(nextDirection);
    setState(next);
  }

  const deleteExpense = useMutation(api.expenses.deleteExpense);
  const deleteIncomeEvent = useMutation(api.incomeEvents.deleteIncomeEvent);
  const updateExpense = useMutation(api.expenses.updateExpense);
  const updateIncomeEvent = useMutation(api.incomeEvents.updateIncomeEvent);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setDirection("forward");
      setState("detail");
      setDeleteError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleDelete() {
    if (!movement) return;
    setDeleteError(null);
    const isIncome = movement.kind === "income";
    const errorMessage = await runDeleteWithBusyFlag(setIsDeleting, () =>
      isIncome
        ? deleteIncomeEvent({ eventId: movement.id as Id<"incomeEvents"> })
        : deleteExpense({ expenseId: movement.id as Id<"expenses"> }),
    );
    if (errorMessage) {
      setDeleteError(errorMessage);
      return;
    }
    track(AnalyticsEvents.MOVEMENT_DELETED, {
      movement_kind: isIncome ? "income" : "expense",
      amount: movement.amount,
      preferred_correct_shown: isIncome,
    });
    onOpenChange(false);
  }

  function renderContent() {
    if (!movement) return null;
    const isIncome = movement.kind === "income";
    const isContribution = movement.kind === "contribution";

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
            onClick={() => handleOpenChange(false)}
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
              {isIncome
                ? "Eliminar borra el registro del ciclo activo y ajusta sobres. Si el problema es que registraste dinero reservado o ya ahorrado, es mejor corregir la distribución sin borrar historial."
                : "Esta acción no se puede deshacer. Los sobres de tu ciclo se recalcularán automáticamente."}
            </p>
          </div>
          {isIncome ? (
            <Link
              href="/cycle/correct"
              className="block rounded-[12px] border border-qp-shield-line bg-qp-panel px-4 py-3 text-[13px] font-semibold text-qp-deep"
              onClick={() => {
                track(AnalyticsEvents.ALLOCATION_CORRECT_CTA_CLICKED, {
                  source: "delete_income",
                });
                onOpenChange(false);
              }}
            >
              Preferible: corregir distribución del ciclo
            </Link>
          ) : null}
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
                goTo("detail", "back");
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
          autoFocus
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
          onSuccess={() => goTo("success")}
          onCancel={() => goTo("detail", "back")}
        />
      );
    }

    if (state === "edit-income" && movement.kind === "income") {
      if (!movement.source || movement.occurredAt === undefined) {
        return (
          <div className="space-y-4">
            <p className="text-[13.5px] leading-relaxed text-mute" role="alert">
              No pudimos cargar los datos para editar este ingreso. Cierra y
              vuelve a abrir el movimiento; si sigue igual, recarga la página.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => goTo("detail", "back")}
              className="h-12 w-full rounded-[12px] border-line text-[14.5px] font-semibold text-mute"
            >
              Volver
            </Button>
          </div>
        );
      }

      return (
        <IncomeEditForm
          autoFocus
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
          onSuccess={() => goTo("success")}
          onCancel={() => goTo("detail", "back")}
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
    const kindLabel = isContribution
      ? "Aporte"
      : isIncome
        ? "Ingreso"
        : "Gasto";

    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-line/70 bg-surface-warm/40 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-ink-secondary">
                {kindLabel}
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
                className={`font-serif text-[20px] font-medium ${movementAmountClassName(movement.kind)}`}
              >
                {movementAmountPrefix(movement.kind)}{" "}
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

        {isContribution ? (
          <p className="text-[13px] leading-relaxed text-mute">
            Los aportes al espacio compartido se registran desde Espacios.
          </p>
        ) : (
          <>
            <p className="text-center font-serif text-[18px] text-ink">
              ¿Qué corregimos de este movimiento?
            </p>

            <div className="space-y-2.5">
              <Button
                type="button"
                onClick={() => goTo(isIncome ? "edit-income" : "edit-expense")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-ink text-[15px] font-semibold text-canvas hover:bg-ink/90"
              >
                <Edit size={16} color="currentColor" aria-hidden />
                Editar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => goTo("confirm-delete")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border-danger-line text-[14.5px] font-semibold text-danger-ink hover:bg-danger-bg"
              >
                <Trash size={16} color="currentColor" aria-hidden />
                Eliminar
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const title = SHEET_TITLES[state];
  const body = renderContent();
  const animatedBody = body ? (
    <AnimatedView
      viewKey={state}
      direction={direction}
      aria-labelledby="movement-sheet-title"
    >
      {body}
    </AnimatedView>
  ) : null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-[24px] border-line bg-card px-5 pb-0 pt-3"
        >
          <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-line" />
          <SheetTitle
            id="movement-sheet-title"
            className="mb-4 shrink-0 pr-8 text-[15px] font-semibold text-ink"
          >
            {title}
          </SheetTitle>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),20px)]">
            {animatedBody}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[400px] gap-0 rounded-[22px] border-line bg-card p-0">
        <DialogTitle
          id="movement-sheet-title"
          className="px-5 pt-5 pr-12 text-[15px] font-semibold text-ink"
        >
          {title}
        </DialogTitle>
        <div className="max-h-[min(85vh,720px)] overflow-y-auto px-5 pb-5 pt-4">
          {animatedBody}
        </div>
      </DialogContent>
    </Dialog>
  );
}

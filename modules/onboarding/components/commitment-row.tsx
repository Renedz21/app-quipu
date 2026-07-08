/**
 * Fila de un compromiso en la lista del paso 6.
 *
 * Muestra ícono (según envelope), nombre, día de pago, monto y botón eliminar.
 */

"use client";

import { Home, Trash2, Zap } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatCents } from "@/shared/lib/money";
import type { CommitmentDraft } from "../types";

interface CommitmentRowProps {
  commitment: CommitmentDraft;
  onRemove: () => void;
}

export function CommitmentRow({ commitment, onRemove }: CommitmentRowProps) {
  const Icon = commitment.envelope === "needs" ? Home : Zap;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"
        aria-hidden
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{commitment.name}</div>
        <div className="text-xs text-muted-foreground">
          Cada día {commitment.dueDay}
        </div>
      </div>
      <div className="text-sm font-semibold tabular-nums">
        {formatCents(commitment.amountCents)}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`Eliminar ${commitment.name}`}
        className="size-8"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

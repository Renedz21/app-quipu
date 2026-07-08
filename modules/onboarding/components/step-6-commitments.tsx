/**
 * Paso 6: Compromisos fijos.
 *
 * Ui (spec §3 paso 6 + frame 6):
 * - Lista de commitments agregados (cards con CommitmentRow).
 * - Botón + "Agregar otro" que abre CommitmentDialog.
 * - Banner inferior: "Aparte S/ {sum} de Necesidades para estos gastos."
 * - CTAs: "Saltar" (envía []), "Continuar".
 *
 * El state de los commitments vive en el provider.
 * Esta UI solo despacha ADD_COMMITMENT y REMOVE_COMMITMENT.
 */

"use client";

import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { formatCents } from "@/shared/lib/money";
import { useOnboarding } from "./onboarding-provider";
import { CommitmentRow } from "./commitment-row";
import { CommitmentDialog } from "./commitment-dialog";
import type { CommitmentDraft } from "../types";

interface Step6CommitmentsProps {
  onAdvance: () => void;
}

export function Step6Commitments({ onAdvance }: Step6CommitmentsProps) {
  const { state, dispatch } = useOnboarding();
  const [dialogOpen, setDialogOpen] = useState(false);

  const needsSum = state.commitments
    .filter((c) => c.envelope === "needs")
    .reduce((acc, c) => acc + c.amountCents, 0);

  const handleAdd = (draft: CommitmentDraft) => {
    dispatch({ type: "ADD_COMMITMENT", payload: draft });
    setDialogOpen(false);
  };

  const handleRemove = (index: number) => {
    dispatch({ type: "REMOVE_COMMITMENT", payload: index });
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1
        className="font-heading text-2xl font-semibold"
        data-step-heading
        tabIndex={-1}
      >
        ¿Tienes gastos fijos?
      </h1>
      <p className="-mt-4 text-sm text-muted-foreground">
        Los aparto de Necesidades antes de repartirlo.
      </p>

      {state.commitments.length > 0 && (
        <div className="flex flex-col gap-2">
          {state.commitments.map((c, i) => (
            <CommitmentRow
              key={i}
              commitment={c}
              onRemove={() => handleRemove(i)}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => setDialogOpen(true)}
        className="h-12 w-full border-dashed"
      >
        <Plus className="size-4" data-icon="inline-start" />
        Agregar otro
      </Button>

      {state.commitments.length > 0 && needsSum > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-primary-soft px-3 py-2.5 text-sm text-foreground">
          <span>
            Aparte {formatCents(needsSum)} de Necesidades para estos gastos.
          </span>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Button
          type="button"
          size="lg"
          onClick={onAdvance}
          className="h-12 w-full text-sm font-semibold"
        >
          Continuar
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
        {state.commitments.length === 0 && (
          <Button
            type="button"
            variant="ghost"
            onClick={onAdvance}
            className="h-10 w-full text-sm"
          >
            Saltar
          </Button>
        )}
      </div>

      <CommitmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAdd}
      />
    </div>
  );
}

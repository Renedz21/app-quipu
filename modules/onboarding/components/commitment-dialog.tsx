/**
 * Diálogo para agregar un compromiso fijo en el paso 6.
 *
 * Form con: nombre, monto (MoneyInput), día del mes (1-31),
 * selector de sobre (Necesidades / Gustos). Valida con
 * `commitmentDraftSchema` antes de emitir el draft.
 *
 * No usa TanStack Form porque los 4 campos tienen validación
 * independiente (no hay validación cruzada entre ellos).
 * useState + Zod safeParse es suficiente.
 */

"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { MoneyInput } from "@/shared/forms/money-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { commitmentDraftSchema } from "../schemas";
import type { CommitmentDraft, CommitmentEnvelope } from "../types";

interface CommitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: CommitmentDraft) => void;
}

export function CommitmentDialog({
  open,
  onOpenChange,
  onSubmit,
}: CommitmentDialogProps) {
  const [name, setName] = useState("");
  const [amountCents, setAmountCents] = useState(0);
  const [dueDay, setDueDay] = useState(1);
  const [envelope, setEnvelope] = useState<CommitmentEnvelope>("needs");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setName("");
    setAmountCents(0);
    setDueDay(1);
    setEnvelope("needs");
    setErrors({});
  };

  const handleSubmit = () => {
    const result = commitmentDraftSchema.safeParse({
      name,
      amountCents,
      dueDay,
      envelope,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString() ?? "_";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    onSubmit(result.data);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo compromiso fijo</DialogTitle>
          <DialogDescription>
            Se descontará de tu sobre cada mes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="commitment-name">Nombre</Label>
            <Input
              id="commitment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alquiler, Internet, etc."
              maxLength={60}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p role="alert" className="text-xs text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Monto</Label>
            <MoneyInput
              value={amountCents}
              onChange={setAmountCents}
              placeholder="0.00"
            />
            {errors.amountCents && (
              <p role="alert" className="text-xs text-destructive">
                {errors.amountCents}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="commitment-day">Día del mes</Label>
            <Input
              id="commitment-day"
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                if (Number.isFinite(n) && n >= 1 && n <= 31) setDueDay(n);
              }}
            />
            {errors.dueDay && (
              <p role="alert" className="text-xs text-destructive">
                {errors.dueDay}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Sobre</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEnvelope("needs")}
                className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors ${
                  envelope === "needs"
                    ? "border-needs bg-needs-soft text-needs"
                    : "border-border bg-card text-foreground"
                }`}
              >
                Necesidades
              </button>
              <button
                type="button"
                onClick={() => setEnvelope("wants")}
                className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors ${
                  envelope === "wants"
                    ? "border-wants bg-wants-soft text-wants"
                    : "border-border bg-card text-foreground"
                }`}
              >
                Gustos
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

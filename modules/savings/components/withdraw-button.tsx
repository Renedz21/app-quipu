"use client";

import { api } from "@/convex/_generated/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/core/components/ui/alert-dialog";
import { Button } from "@/core/components/ui/button";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

type Props = {
  emergencyBalance: number;
};

export function WithdrawButton({ emergencyBalance }: Props) {
  const withdraw = useMutation(api.savings.withdrawFromEmergencyFund);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await withdraw({ amount: emergencyBalance, confirm: true });
    } catch (err) {
      if (err instanceof ConvexError) setError(String(err.data));
      else setError("Ocurrió un error. Inténtalo de nuevo.");
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full text-xs">
          Retirar del Fondo de Emergencia
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <AlertDialogTitle className="text-yellow-600">
              ¿Es una emergencia real?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            Este dinero está reservado para emergencias reales: pérdida de
            empleo, emergencias médicas o reparaciones urgentes. Retirar de este
            fondo retrasará tu meta de seguridad financiera.
            {error && <p className="text-destructive text-sm">{error}</p>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No, mantener mi ahorro</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            Sí, es una emergencia real
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

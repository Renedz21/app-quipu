import type { DraftCommitment } from "./types";

export function isCommitmentValid(commitment: DraftCommitment): boolean {
  return (
    commitment.name.trim().length > 0 &&
    commitment.amountCents > 0 &&
    commitment.dueDay >= 1 &&
    commitment.dueDay <= 31
  );
}

/** Suma de montos de solo los compromisos válidos (pasos 4 y confirmación). */
export function validCommitmentsTotalCents(
  commitments: DraftCommitment[],
): number {
  return commitments
    .filter(isCommitmentValid)
    .reduce((acc, c) => acc + c.amountCents, 0);
}

export function commitmentErrorMessage(
  commitment: DraftCommitment,
): string | null {
  const falta: string[] = [];
  if (commitment.name.trim().length === 0) falta.push("el nombre");
  if (commitment.amountCents <= 0) falta.push("el monto");
  if (commitment.dueDay < 1) falta.push("el día");

  const parts: string[] = [];
  if (falta.length === 1) parts.push(`Falta ${falta[0]}.`);
  if (falta.length === 2) parts.push(`Falta ${falta[0]} y ${falta[1]}.`);
  if (falta.length === 3) {
    parts.push(`Falta ${falta[0]}, ${falta[1]} y ${falta[2]}.`);
  }
  if (commitment.dueDay > 31) {
    parts.push("El día debe ser del 1 al 31.");
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

const REPEATABLE_CHIP = "otro";

/** Chips con nombre fijo (Agua, Luz…) no se pueden volver a agregar. Otro sí. */
export function isNamedChipTaken(
  chipName: string,
  commitments: DraftCommitment[],
): boolean {
  if (chipName.trim().toLowerCase() === REPEATABLE_CHIP) return false;
  const needle = chipName.trim().toLowerCase();
  return commitments.some((c) => c.name.trim().toLowerCase() === needle);
}

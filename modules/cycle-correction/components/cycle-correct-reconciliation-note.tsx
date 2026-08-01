import { formatCents } from "@/shared/lib/money";

type Props = {
  quipuLiquidCents: number;
  declaredLiquidCents: number;
  reconciliationDeltaCents: number;
  currencyCode: string;
};

export function CycleCorrectReconciliationNote({
  quipuLiquidCents,
  declaredLiquidCents,
  reconciliationDeltaCents,
  currencyCode,
}: Props) {
  if (reconciliationDeltaCents === 0) {
    return (
      <p className="text-[12.5px] text-mute">
        En Quipu ahora:{" "}
        {formatCents(quipuLiquidCents, { currency: currencyCode })}. Tu
        distribución conserva ese líquido.
      </p>
    );
  }

  const abs = Math.abs(reconciliationDeltaCents);
  const signed = formatCents(abs, { currency: currencyCode });
  const direction = reconciliationDeltaCents > 0 ? "+" : "−";

  return (
    <div className="rounded-[14px] border border-line bg-card px-4 py-3">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
        Conciliación bancaria
      </p>
      <p className="mt-1 text-[13px] text-ink">
        En Quipu: {formatCents(quipuLiquidCents, { currency: currencyCode })}.
        Tu distribución suma{" "}
        {formatCents(declaredLiquidCents, { currency: currencyCode })}.
      </p>
      <p className="mt-1 text-[13px] text-ink">
        Ajuste de conciliación: {direction}
        {signed}. No es ingreso, gasto ni ahorro: solo alinea Quipu con el saldo
        del banco.
      </p>
    </div>
  );
}

/**
 * Ajusta un sobre a un nuevo valor, repartiendo el delta entre los otros 2
 * en proporción inversa a su tamaño actual. Si el otro está en 0, todo
 * el delta va al tercero. Garantiza que la suma quede exactamente en 100.
 *
 * Función pura: no muta nada, solo computa.
 */
export function computeAllocation(
  key: "needs" | "wants" | "savings",
  newValue: number,
  current: { needs: number; wants: number; savings: number },
): { needs: number; wants: number; savings: number } {
  const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
  const copy = { ...current };
  const oldValue = copy[key];
  const delta = oldValue - clamped;
  copy[key] = clamped;

  const others = (Object.keys(copy) as Array<"needs" | "wants" | "savings">).filter(
    (k) => k !== key,
  );
  const [other1, other2] = others as ["needs" | "wants" | "savings", "needs" | "wants" | "savings"];
  const sumOthers = copy[other1] + copy[other2];

  if (sumOthers === 0) {
    copy[other1] = delta / 2;
    copy[other2] = delta / 2;
  } else {
    copy[other1] += delta * (copy[other1] / sumOthers);
    copy[other2] += delta * (copy[other2] / sumOthers);
  }

  const rounded = {
    needs: Math.round(copy.needs),
    wants: Math.round(copy.wants),
    savings: Math.round(copy.savings),
  };
  const roundedSum = rounded.needs + rounded.wants + rounded.savings;
  const remainder = 100 - roundedSum;
  rounded[other1] += remainder;

  rounded[key] = Math.max(0, Math.min(100, rounded[key]));
  rounded[other1] = Math.max(0, Math.min(100, rounded[other1]));
  rounded[other2] = Math.max(0, Math.min(100, rounded[other2]));

  return rounded;
}

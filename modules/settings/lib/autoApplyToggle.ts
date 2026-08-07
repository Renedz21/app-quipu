import type { ExtraordinaryRulesAutoApply } from "@/shared/lib/extraordinaryIncome";

export type AutoApplyToggleDecision = "paywall" | "skip" | "mutate";

/**
 * Decide si un click en el switch debe abrir paywall, ignorarse o mutar.
 * Evita doble envío mientras hay request en vuelo (sensación de “fallo”).
 */
export function decideAutoApplyToggle(input: {
  isPremium: boolean;
  pending: boolean;
  currentChecked: boolean;
  nextChecked: boolean;
}): AutoApplyToggleDecision {
  if (!input.isPremium) return "paywall";
  if (input.pending) return "skip";
  if (input.currentChecked === input.nextChecked) return "skip";
  return "mutate";
}

export function patchAutoApply(
  current: ExtraordinaryRulesAutoApply,
  key: keyof ExtraordinaryRulesAutoApply,
  checked: boolean,
): ExtraordinaryRulesAutoApply {
  return { ...current, [key]: checked };
}

/** ¿El servidor ya alcanzó el override optimista? */
export function optimisticAutoApplySettled(
  server: ExtraordinaryRulesAutoApply,
  optimistic: Partial<ExtraordinaryRulesAutoApply>,
): boolean {
  return (
    Object.keys(optimistic) as Array<keyof ExtraordinaryRulesAutoApply>
  ).every((key) => server[key] === optimistic[key]);
}

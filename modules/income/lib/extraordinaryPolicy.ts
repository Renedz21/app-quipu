import type { DistributionPolicy } from "@/shared/lib/allocations";
import {
  extraordinaryProfileRuleLabel,
  mergeExtraordinaryRules,
  resolveExtraordinaryRuleKey,
  suggestedEventPolicyForType,
  type ExtraordinaryProfileRule,
  type ExtraordinaryRules,
  type ExtraordinaryType,
} from "@/shared/lib/extraordinaryIncome";

export function activeExtraordinaryRuleLabel(
  type: ExtraordinaryType | undefined,
  rules: Partial<ExtraordinaryRules> | undefined,
): string | null {
  if (!type) return null;
  const merged = mergeExtraordinaryRules(rules);
  const key = resolveExtraordinaryRuleKey(type);
  const rule = merged[key] as ExtraordinaryProfileRule;
  return extraordinaryProfileRuleLabel(rule);
}

export function policyForExtraordinaryType(
  type: ExtraordinaryType,
  rules: Partial<ExtraordinaryRules> | undefined,
): DistributionPolicy | undefined {
  const suggested = suggestedEventPolicyForType(type, rules);
  return suggested === "ask_each_time" ? undefined : suggested;
}

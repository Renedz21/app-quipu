import type { DistributionPolicy } from "@/shared/lib/allocations";
import {
  type ExtraordinaryProfileRule,
  type ExtraordinaryRules,
  type ExtraordinaryRulesAutoApply,
  type ExtraordinaryType,
  extraordinaryProfileRuleLabel,
  mergeExtraordinaryRules,
  mergeExtraordinaryRulesAutoApply,
  resolveExtraordinaryRuleKey,
  suggestedEventPolicyForType,
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

export function shouldSkipExtraordinaryConfirmation(
  isPremium: boolean,
  type: ExtraordinaryType | undefined,
  rules: Partial<ExtraordinaryRules> | undefined,
  autoApply: Partial<ExtraordinaryRulesAutoApply> | undefined,
): boolean {
  if (!isPremium || !type) return false;
  const mergedAutoApply = mergeExtraordinaryRulesAutoApply(autoApply);
  const key = resolveExtraordinaryRuleKey(type);
  if (!mergedAutoApply[key]) return false;
  return suggestedEventPolicyForType(type, rules) !== "ask_each_time";
}

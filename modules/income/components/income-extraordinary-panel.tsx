"use client";

import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import type { DistributionPolicy } from "@/shared/lib/allocations";
import {
  EXTRAORDINARY_TYPES,
  type ExtraordinaryProfileRule,
  type ExtraordinaryRules,
  type ExtraordinaryType,
  extraordinaryProfileRuleLabel,
  extraordinaryTypeLabel,
  mergeExtraordinaryRules,
  suggestedEventPolicyForType,
} from "@/shared/lib/extraordinaryIncome";
import { cn } from "@/shared/lib/utils";
import {
  INCOME_EXTRAORDINARY_CUSTOM_LABEL,
  INCOME_EXTRAORDINARY_DESTINATION_LABEL,
  INCOME_EXTRAORDINARY_KIND_LABEL,
  INCOME_EXTRAORDINARY_TYPE_LABEL,
} from "../constants";

const POLICY_OPTIONS: ReadonlyArray<{
  value: DistributionPolicy;
  label: string;
}> = [
    { value: "profile_default", label: "Mi distribución habitual" },
    { value: "all_to_savings", label: "Todo al ahorro" },
  ];

type Props = {
  incomeKind: "habitual" | "extraordinary";
  onIncomeKindChange: (kind: "habitual" | "extraordinary") => void;
  extraordinaryType: ExtraordinaryType | undefined;
  onExtraordinaryTypeChange: (type: ExtraordinaryType) => void;
  extraordinaryLabel: string;
  onExtraordinaryLabelChange: (label: string) => void;
  distributionPolicy: DistributionPolicy | undefined;
  onDistributionPolicyChange: (policy: DistributionPolicy) => void;
  profileRules: Partial<ExtraordinaryRules> | undefined;
  fieldErrors: {
    extraordinaryType?: string;
    extraordinaryLabel?: string;
    distributionPolicy?: string;
  };
};

function activeRuleLabel(
  type: ExtraordinaryType | undefined,
  rules: Partial<ExtraordinaryRules> | undefined,
): string | null {
  if (!type) return null;
  const merged = mergeExtraordinaryRules(rules);
  const key =
    type === "gratification_july" || type === "gratification_december"
      ? "gratifications"
      : type === "custom"
        ? "custom"
        : type;
  const rule = merged[
    key as keyof ExtraordinaryRules
  ] as ExtraordinaryProfileRule;
  return extraordinaryProfileRuleLabel(rule);
}

export function IncomeExtraordinaryPanel({
  incomeKind,
  onIncomeKindChange,
  extraordinaryType,
  onExtraordinaryTypeChange,
  extraordinaryLabel,
  onExtraordinaryLabelChange,
  distributionPolicy,
  onDistributionPolicyChange,
  profileRules,
  fieldErrors,
}: Props) {
  const ruleCopy = activeRuleLabel(extraordinaryType, profileRules);

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel className="mb-2 block text-[12.5px] font-medium text-ink-secondary">
          {INCOME_EXTRAORDINARY_KIND_LABEL}
        </FieldLabel>
        <div className="flex gap-2">
          {(
            [
              ["habitual", "Habitual"],
              ["extraordinary", "Extraordinario"],
            ] as const
          ).map(([kind, label]) => {
            const selected = incomeKind === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onIncomeKindChange(kind)}
                className={cn(
                  "flex-1 rounded-[11px] border px-3 py-2.5 text-sm font-medium transition-colors",
                  selected && kind === "extraordinary"
                    ? "border-extraordinary-a bg-extraordinary-surface text-extraordinary-b"
                    : selected
                      ? "border-[1.5px] border-qp bg-qp-soft font-semibold text-qp-deep"
                      : "border-line bg-card text-ink-secondary hover:border-line-strong",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Field>

      {incomeKind === "extraordinary" ? (
        <>
          <Field data-invalid={Boolean(fieldErrors.extraordinaryType)}>
            <FieldLabel className="mb-2 block text-[12.5px] font-medium text-ink-secondary">
              {INCOME_EXTRAORDINARY_TYPE_LABEL}
            </FieldLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EXTRAORDINARY_TYPES.map((type) => {
                const selected = extraordinaryType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onExtraordinaryTypeChange(type)}
                    className={cn(
                      "rounded-[11px] border px-3 py-2.5 text-left text-sm transition-colors",
                      selected
                        ? "border-extraordinary-a bg-extraordinary-surface font-semibold text-extraordinary-b"
                        : "border-line bg-card text-ink-secondary hover:border-extraordinary-border",
                    )}
                  >
                    {extraordinaryTypeLabel(type)}
                  </button>
                );
              })}
            </div>
            {fieldErrors.extraordinaryType ? (
              <FieldError
                className="mt-2"
                errors={[{ message: fieldErrors.extraordinaryType }]}
              />
            ) : null}
          </Field>

          {extraordinaryType === "custom" ? (
            <Field data-invalid={Boolean(fieldErrors.extraordinaryLabel)}>
              <FieldLabel
                htmlFor="extraordinary-label"
                className="mb-2 block text-[12.5px] font-medium text-ink-secondary"
              >
                {INCOME_EXTRAORDINARY_CUSTOM_LABEL}
              </FieldLabel>
              <Input
                id="extraordinary-label"
                value={extraordinaryLabel}
                onChange={(event) =>
                  onExtraordinaryLabelChange(event.target.value)
                }
                placeholder="Ej. bono por meta anual"
                className="h-[46px] rounded-[11px] border-line bg-card text-[14.5px]"
              />
              {fieldErrors.extraordinaryLabel ? (
                <FieldError
                  errors={[{ message: fieldErrors.extraordinaryLabel }]}
                />
              ) : null}
            </Field>
          ) : null}

          {ruleCopy ? (
            <p className="rounded-[11px] border border-extraordinary-border bg-extraordinary-surface px-3 py-2 text-[13px] text-extraordinary-b">
              Automatización en ajustes: {ruleCopy}
            </p>
          ) : null}

          {extraordinaryType ? (
            <Field data-invalid={Boolean(fieldErrors.distributionPolicy)}>
              <FieldLabel className="mb-2 block text-[12.5px] font-medium text-ink-secondary">
                {INCOME_EXTRAORDINARY_DESTINATION_LABEL}
              </FieldLabel>
              <div className="flex flex-col gap-2">
                {POLICY_OPTIONS.map((option) => {
                  const selected = distributionPolicy === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onDistributionPolicyChange(option.value)}
                      className={cn(
                        "rounded-[11px] border px-3 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "border-extraordinary-a bg-extraordinary-surface font-semibold text-extraordinary-b"
                          : "border-line bg-card text-ink-secondary hover:border-line-strong",
                      )}
                    >
                      {option.value === "all_to_savings" &&
                        extraordinaryType === "cts"
                        ? "Todo al Fondo de emergencia"
                        : option.label}
                    </button>
                  );
                })}
              </div>
              {fieldErrors.distributionPolicy ? (
                <FieldError
                  errors={[{ message: fieldErrors.distributionPolicy }]}
                />
              ) : null}
            </Field>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function policyForExtraordinaryType(
  type: ExtraordinaryType,
  rules: Partial<ExtraordinaryRules> | undefined,
): DistributionPolicy | undefined {
  const suggested = suggestedEventPolicyForType(type, rules);
  return suggested === "ask_each_time" ? undefined : suggested;
}

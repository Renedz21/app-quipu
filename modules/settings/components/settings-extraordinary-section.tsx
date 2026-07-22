"use client";

import { toast } from "sonner";
import { fromConvexError } from "@/core/errors";
import { useMyProfile } from "@/modules/auth/hooks/use-my-profile";
import {
  type ExtraordinaryProfileRule,
  type ExtraordinaryRules,
  extraordinaryProfileRuleLabel,
  mergeExtraordinaryRules,
} from "@/shared/lib/extraordinaryIncome";
import { cn } from "@/shared/lib/utils";
import { useUpdateExtraordinaryRules } from "../actions";
import {
  SETTINGS_EXTRAORDINARY_BONUS,
  SETTINGS_EXTRAORDINARY_CTS,
  SETTINGS_EXTRAORDINARY_CUSTOM,
  SETTINGS_EXTRAORDINARY_GRATIFICATIONS,
  SETTINGS_EXTRAORDINARY_LABEL,
  SETTINGS_EXTRAORDINARY_PROFIT,
} from "../constants";

const RULE_OPTIONS: ExtraordinaryProfileRule[] = [
  "profile_default",
  "all_to_savings",
  "all_to_emergency_fund",
  "ask_each_time",
];

const ROWS: ReadonlyArray<{
  key: keyof ExtraordinaryRules;
  label: string;
}> = [
  { key: "gratifications", label: SETTINGS_EXTRAORDINARY_GRATIFICATIONS },
  { key: "cts", label: SETTINGS_EXTRAORDINARY_CTS },
  { key: "corporate_bonus", label: SETTINGS_EXTRAORDINARY_BONUS },
  { key: "profit_sharing", label: SETTINGS_EXTRAORDINARY_PROFIT },
  { key: "custom", label: SETTINGS_EXTRAORDINARY_CUSTOM },
];

export function SettingsExtraordinarySection({
  className,
}: {
  className?: string;
}) {
  const profile = useMyProfile();
  const updateRules = useUpdateExtraordinaryRules();

  if (!profile) return null;

  const rules = mergeExtraordinaryRules(profile.extraordinaryRules);

  async function onRuleChange(
    key: keyof ExtraordinaryRules,
    value: ExtraordinaryProfileRule,
  ) {
    try {
      await updateRules({
        extraordinaryRules: { ...rules, [key]: value },
      });
    } catch (error) {
      toast.error(fromConvexError(error).message);
    }
  }

  return (
    <section
      className={cn(
        "rounded-[14px] border border-extraordinary-border bg-card px-4 py-3",
        className,
      )}
    >
      <p className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.1em] text-extraordinary-b">
        {SETTINGS_EXTRAORDINARY_LABEL}
      </p>
      <ul className="divide-y divide-line-subtle">
        {ROWS.map((row) => (
          <li
            key={row.key}
            className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-[13.5px] text-ink">{row.label}</span>
            <select
              className="h-9 min-w-[12rem] rounded-[9px] border border-line bg-canvas px-2 text-[13px] text-ink"
              value={rules[row.key]}
              onChange={(event) =>
                void onRuleChange(
                  row.key,
                  event.target.value as ExtraordinaryProfileRule,
                )
              }
            >
              {RULE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {extraordinaryProfileRuleLabel(option)}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11.5px] text-mute">
        Sugieren destino al registrar; siempre confirmas en el ingreso.
      </p>
    </section>
  );
}

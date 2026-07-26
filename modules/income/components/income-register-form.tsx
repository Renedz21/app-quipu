"use client";

import { useForm } from "@tanstack/react-form";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft } from "reicon-react";
import type { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  AnalyticsEvents,
  mapDistributionPolicyToAllocationMode,
  mapExtraordinaryTypeToIncomeType,
  mapHabitualSourceToIncomeType,
  track,
  trackFinancialCycleTransition,
} from "@/core/analytics";
import { fromConvexError } from "@/core/errors";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import type { DistributionPolicy } from "@/shared/lib/allocations";
import { limaStartOfDay } from "@/shared/lib/date";
import type { ExtraordinaryType } from "@/shared/lib/extraordinaryIncome";
import { cn } from "@/shared/lib/utils";
import {
  getExtraordinarySubmitCta,
  getIncomeSourceLabel,
  INCOME_CANCEL_CTA,
  INCOME_EXTRAORDINARY_CONTINUE_CTA,
  INCOME_EXTRAORDINARY_DETAILS_SUBTITLE,
  INCOME_EXTRAORDINARY_PICK_HINT,
  INCOME_EXTRAORDINARY_TYPE_SECTION,
  INCOME_PAGE_SUBTITLE,
  INCOME_PAGE_SUBTITLE_KIND,
  INCOME_PAGE_TITLE,
  INCOME_SUBMIT_CTA,
} from "../constants";
import { policyForExtraordinaryType } from "../lib/extraordinaryPolicy";
import {
  computeImpactPreview,
  resolveCycleDaysForPreview,
} from "../lib/impactPreview";
import { buildIncomeDescription } from "../lib/incomeForm";
import { suggestHeldCentsForPreview } from "../lib/impactPreview";
import {
  createIncomeRegisterSchema,
  type IncomeRegisterFormValues,
} from "../schemas";
import type { IncomeRegisterResult, IncomeSource } from "../types";
import { IncomeDestinationDialog } from "./income-destination-dialog";
import { IncomeExtraordinaryDetailsFields } from "./income-extraordinary-details-fields";
import { IncomeExtraordinaryRuleBanner } from "./income-extraordinary-rule-banner";
import { IncomeExtraordinaryTypeGrid } from "./income-extraordinary-type-grid";
import type { IncomeFormField } from "./income-form-field";
import { IncomeImpactPreview } from "./income-impact-preview";
import { IncomeKindToggle } from "./income-kind-toggle";
import { IncomeRegisterHabitualFields } from "./income-register-habitual-fields";

type DashboardSummary = FunctionReturnType<typeof api.dashboard.getSummary>;
type ExtraStep = "pickType" | "details";

type Props = {
  currencyCode: string;
  profile: Doc<"profiles">;
  summary: DashboardSummary | undefined;
  onSuccess: (
    result: IncomeRegisterResult,
    options?: {
      incomeKind: "habitual" | "extraordinary";
      distributionPolicy?: DistributionPolicy;
    },
  ) => void;
  createIncomeEvent: (
    args: FunctionArgs<typeof api.incomeEvents.createIncomeEvent>,
  ) => Promise<IncomeRegisterResult>;
};

const silentSet = { dontValidate: true } as const;

function extraTypeToExtraIncomeType(
  type: ExtraordinaryType | undefined,
): "gratification" | "cts" | "bonus" | "utilities" | "other" {
  if (type === "gratification_july" || type === "gratification_december") {
    return "gratification";
  }
  if (type === "cts") return "cts";
  if (type === "corporate_bonus") return "bonus";
  if (type === "profit_sharing") return "utilities";
  return "other";
}

function incomeDestinationEnvelope(
  incomeKind: "habitual" | "extraordinary",
  distributionPolicy: DistributionPolicy | undefined,
  allocations: { needs: number; wants: number; savings: number },
): "needs" | "wants" | "savings" {
  if (
    incomeKind === "extraordinary" &&
    distributionPolicy === "all_to_savings"
  ) {
    return "savings";
  }
  if (
    allocations.needs >= allocations.wants &&
    allocations.needs >= allocations.savings
  ) {
    return "needs";
  }
  if (allocations.savings >= allocations.wants) {
    return "savings";
  }
  return "wants";
}

export function IncomeRegisterForm({
  currencyCode,
  profile,
  summary,
  onSuccess,
  createIncomeEvent,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [extraStep, setExtraStep] = useState<ExtraStep>("pickType");
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [destinationSubmitAfterConfirm, setDestinationSubmitAfterConfirm] =
    useState(false);
  const [pickTypeError, setPickTypeError] = useState<string | null>(null);
  const formSchema = useMemo(() => createIncomeRegisterSchema(), []);

  const form = useForm({
    defaultValues: {
      incomeKind: "habitual" as "habitual" | "extraordinary",
      amountCents: 0,
      source: "payroll" as IncomeSource,
      concept: "",
      occurredAt: limaStartOfDay(),
      extraordinaryType: undefined as ExtraordinaryType | undefined,
      extraordinaryLabel: "",
      distributionPolicy: undefined as DistributionPolicy | undefined,
      heldCents: 0,
    } satisfies IncomeRegisterFormValues,
    validators: {
      onSubmit: ({ value }) => {
        const parsed = formSchema.safeParse(value);
        if (parsed.success) return undefined;
        return parsed.error.issues[0]?.message ?? "Revisa el formulario.";
      },
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        if (value.incomeKind === "extraordinary") {
          if (!value.distributionPolicy) {
            setDestinationSubmitAfterConfirm(true);
            setDestinationOpen(true);
            return;
          }
          const response = await createIncomeEvent({
            amount: value.amountCents,
            source: "payroll",
            description: "",
            occurredAt: value.occurredAt,
            incomeKind: "extraordinary",
            extraordinaryType: value.extraordinaryType,
            extraordinaryLabel:
              value.extraordinaryType === "custom"
                ? value.extraordinaryLabel.trim()
                : undefined,
            distributionPolicy: value.distributionPolicy,
            ...(value.heldCents && value.heldCents > 0
              ? { heldCents: value.heldCents }
              : {}),
          });
          track(AnalyticsEvents.INCOME_REGISTERED, {
            amount: value.amountCents,
            envelope: incomeDestinationEnvelope(
              "extraordinary",
              value.distributionPolicy,
              {
                needs: profile.allocationNeeds,
                wants: profile.allocationWants,
                savings: profile.allocationSavings,
              },
            ),
            income_kind: "extraordinary",
            income_type: mapExtraordinaryTypeToIncomeType(
              value.extraordinaryType,
            ),
            allocation_mode: mapDistributionPolicyToAllocationMode(
              value.distributionPolicy,
            ),
            cycle_id: response.cycleId,
            days_remaining_in_cycle: summary?.cycle?.daysRemaining,
            is_first_income: response.isNewCycle,
          });
          track(AnalyticsEvents.EXTRA_INCOME_REGISTERED, {
            amount: value.amountCents,
            type: extraTypeToExtraIncomeType(value.extraordinaryType),
            cycle_id: response.cycleId,
            distribution_policy: mapDistributionPolicyToAllocationMode(
              value.distributionPolicy,
            ),
          });
          if (response.isNewCycle) {
            trackFinancialCycleTransition(summary?.cycle?.id, response);
          }
          onSuccess(response, {
            incomeKind: "extraordinary",
            distributionPolicy: value.distributionPolicy,
          });
          return;
        }

        const description = buildIncomeDescription(
          getIncomeSourceLabel(value.source),
          value.concept,
        );
        const response = await createIncomeEvent({
          amount: value.amountCents,
          source: value.source,
          description,
          occurredAt: value.occurredAt,
          incomeKind: "habitual",
          ...(value.heldCents && value.heldCents > 0
            ? { heldCents: value.heldCents }
            : {}),
        });
        track(AnalyticsEvents.INCOME_REGISTERED, {
          amount: value.amountCents,
          envelope: incomeDestinationEnvelope("habitual", undefined, {
            needs: profile.allocationNeeds,
            wants: profile.allocationWants,
            savings: profile.allocationSavings,
          }),
          income_kind: "habitual",
          income_type: mapHabitualSourceToIncomeType(value.source),
          allocation_mode: mapDistributionPolicyToAllocationMode(undefined),
          cycle_id: response.cycleId,
          days_remaining_in_cycle: summary?.cycle?.daysRemaining,
          is_first_income: response.isNewCycle,
        });
        if (response.isNewCycle) {
          trackFinancialCycleTransition(summary?.cycle?.id, response);
        }
        onSuccess(response, { incomeKind: "habitual" });
      } catch (error) {
        setServerError(fromConvexError(error).message);
      }
    },
  });

  const resetExtraordinary = () => {
    setExtraStep("pickType");
    setPickTypeError(null);
    form.setFieldValue("extraordinaryType", undefined, silentSet);
    form.setFieldValue("extraordinaryLabel", "", silentSet);
    form.setFieldValue("distributionPolicy", undefined, silentSet);
    form.setFieldValue("heldCents", 0, silentSet);
  };

  return (
    <>
      {/* Immersive mobile header — sticky, hidden on md+ (desktop keeps sidebar + page title) */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-[calc(52px+env(safe-area-inset-top))] items-end border-b border-line bg-canvas/95 px-4 pb-3 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-[13.5px] text-mute hover:text-ink"
          aria-label="Volver al inicio"
        >
          <ArrowLeft size={16} aria-hidden />
          Volver
        </Link>
        <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-serif text-[17px] font-medium text-ink">
          {INCOME_PAGE_TITLE}
        </span>
      </div>

      <form
        className="mx-auto w-full max-w-6xl px-4 pt-[calc(68px+env(safe-area-inset-top))] pb-6 md:px-8 md:py-8 md:pt-8"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Subscribe selector={(state) => state.values}>
          {(values) => {
            const isExtraordinary = values.incomeKind === "extraordinary";
            const showPick = isExtraordinary && extraStep === "pickType";
            const showDetails =
              isExtraordinary &&
              extraStep === "details" &&
              values.extraordinaryType;
            const showFormCtas = !isExtraordinary || Boolean(showDetails);

            const subtitle = isExtraordinary
              ? showPick
                ? INCOME_PAGE_SUBTITLE_KIND
                : INCOME_EXTRAORDINARY_DETAILS_SUBTITLE
              : INCOME_PAGE_SUBTITLE;

          // P3-4: suggestion from uncovered commitment remainders.
          const uncoveredSum =
            summary?.commitments?.reduce((sum, c) => {
              const isUncovered =
                c.cascadeStatus === "partial" ||
                c.cascadeStatus === "not-started" ||
                c.cascadeStatus === "overdue";
              return sum + (isUncovered ? c.remaining : 0);
            }, 0) ?? 0;
          const suggestedHeldCents =
            values.amountCents > 0 && uncoveredSum > 0
              ? suggestHeldCentsForPreview(values.amountCents, uncoveredSum)
              : undefined;

          const previewInput =
            values.amountCents > 0
              ? computeImpactPreview({
                  amountCents: values.amountCents,
                  weights: {
                    allocationNeeds: profile.allocationNeeds,
                    allocationWants: profile.allocationWants,
                    allocationSavings: profile.allocationSavings,
                  },
                  currentEnvelopes: {
                    needs:
                      summary?.envelopes?.find((e) => e.type === "needs")
                        ?.remainingAmount ?? 0,
                    wants:
                      summary?.envelopes?.find((e) => e.type === "wants")
                        ?.remainingAmount ?? 0,
                    savings:
                      summary?.envelopes?.find((e) => e.type === "savings")
                        ?.remainingAmount ?? 0,
                  },
                  daysRemaining:
                    summary?.cycle?.daysRemaining ??
                    resolveCycleDaysForPreview({
                      incomeModel: profile.incomeModel,
                      payFrequency: profile.payFrequency,
                      cycleDurationDays: profile.cycleDurationDays,
                    }),
                  distributionPolicy: isExtraordinary
                    ? values.distributionPolicy
                    : undefined,
                  heldCents: values.heldCents ?? 0,
                })
              : null;

            const submitLabel =
              isExtraordinary && values.extraordinaryType
                ? getExtraordinarySubmitCta(values.extraordinaryType)
                : INCOME_SUBMIT_CTA;

            return (
              <>
                {/* Desktop title — hidden on mobile (shown in fixed header above) */}
                {!showDetails ? (
                  <div className="mb-6 hidden md:mb-8 md:block">
                    <h1 className="font-serif text-[27px] font-medium text-ink">
                      {INCOME_PAGE_TITLE}
                    </h1>
                    <p className="mt-1 text-[13.5px] text-mute">{subtitle}</p>
                  </div>
                ) : null}

                {/* Mobile subtitle — only shown when NOT on desktop (title is in the fixed header) */}
                {!showDetails ? (
                  <p className="mb-4 text-[13px] text-mute md:hidden">
                    {subtitle}
                  </p>
                ) : null}

                <div className="mb-6">
                  <IncomeKindToggle
                    value={values.incomeKind}
                    onChange={(kind) => {
                      form.setFieldValue("incomeKind", kind);
                      if (kind === "habitual") resetExtraordinary();
                      else setExtraStep("pickType");
                    }}
                  />
                </div>

                {showPick ? (
                  <>
                    <p className="mb-3 font-mono text-[10.5px] tracking-[0.1em] text-mute uppercase">
                      {INCOME_EXTRAORDINARY_TYPE_SECTION}
                    </p>
                    <IncomeExtraordinaryTypeGrid
                      value={values.extraordinaryType}
                      onChange={(type) => {
                        setPickTypeError(null);
                        form.setFieldValue("extraordinaryType", type);
                        form.setFieldValue(
                          "distributionPolicy",
                          policyForExtraordinaryType(
                            type,
                            profile.extraordinaryRules,
                          ),
                          silentSet,
                        );
                      }}
                      error={pickTypeError ?? undefined}
                    />
                    <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[12.5px] text-mute">
                        {INCOME_EXTRAORDINARY_PICK_HINT}
                      </p>
                      <Button
                        type="button"
                        className="h-[46px] rounded-[11px] bg-ink px-[26px] text-[14.5px] font-semibold text-canvas"
                        onClick={() => {
                          if (!values.extraordinaryType) {
                            setPickTypeError(
                              "Elige un tipo de ingreso extraordinario.",
                            );
                            return;
                          }
                          setExtraStep("details");
                        }}
                      >
                        {INCOME_EXTRAORDINARY_CONTINUE_CTA}
                      </Button>
                    </div>
                  </>
                ) : null}

                {!isExtraordinary || showDetails ? (
                  <div
                    className={cn(
                      "grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-7",
                      showDetails && "mt-2",
                    )}
                  >
                    <div className="space-y-5">
                    {showDetails ? (
                      <form.Field name="amountCents">
                        {(amountField) => (
                          <form.Field name="occurredAt">
                            {(occurredAtField) => (
                              <form.Field name="extraordinaryLabel">
                                {(labelField) => (
                                  <form.Field name="heldCents">
                                    {(heldField) => (
                                      <IncomeExtraordinaryDetailsFields
                                        currencyCode={currencyCode}
                                        extraordinaryType={showDetails}
                                        amountField={amountField}
                                        occurredAtField={occurredAtField}
                                        labelField={
                                          labelField as IncomeFormField<"extraordinaryLabel">
                                        }
                                        heldField={
                                          heldField as IncomeFormField<"heldCents">
                                        }
                                        suggestedHeldCents={suggestedHeldCents}
                                      />
                                    )}
                                  </form.Field>
                                )}
                              </form.Field>
                            )}
                          </form.Field>
                        )}
                      </form.Field>
                    ) : !isExtraordinary ? (
                      <form.Field name="amountCents">
                        {(amountField) => (
                          <form.Field name="occurredAt">
                            {(occurredAtField) => (
                              <form.Field name="source">
                                {(sourceField) => (
                                  <form.Field name="concept">
                                    {(conceptField) => (
                                      <form.Field name="heldCents">
                                        {(heldField) => (
                                          <IncomeRegisterHabitualFields
                                            currencyCode={currencyCode}
                                            amountField={amountField}
                                            occurredAtField={occurredAtField}
                                            sourceField={sourceField}
                                            conceptField={conceptField}
                                            heldField={
                                              heldField as IncomeFormField<"heldCents">
                                            }
                                            suggestedHeldCents={
                                              suggestedHeldCents
                                            }
                                          />
                                        )}
                                      </form.Field>
                                    )}
                                  </form.Field>
                                )}
                              </form.Field>
                            )}
                          </form.Field>
                        )}
                      </form.Field>
                    ) : null}
                    </div>

                    <div className="flex flex-col gap-3.5">
                      {showDetails && values.extraordinaryType ? (
                        <IncomeExtraordinaryRuleBanner
                          extraordinaryType={values.extraordinaryType}
                          profileRules={profile.extraordinaryRules}
                          allocationNeeds={profile.allocationNeeds}
                          allocationWants={profile.allocationWants}
                          allocationSavings={profile.allocationSavings}
                          onChangeDestination={() => {
                            setDestinationSubmitAfterConfirm(false);
                            setDestinationOpen(true);
                          }}
                        />
                      ) : null}
                      <IncomeImpactPreview
                        preview={previewInput}
                        currencyCode={currencyCode}
                        moveSurplusHref={
                          showDetails ? "/savings/move?from=wants" : undefined
                        }
                      />
                    </div>
                  </div>
                ) : null}

                {showDetails && values.extraordinaryType ? (
                  <IncomeDestinationDialog
                    open={destinationOpen}
                    onOpenChange={setDestinationOpen}
                    extraordinaryType={values.extraordinaryType}
                    amountCents={values.amountCents}
                    currencyCode={currencyCode}
                    preview={previewInput}
                    value={values.distributionPolicy}
                    onConfirm={(policy) => {
                      form.setFieldValue("distributionPolicy", policy);
                      if (destinationSubmitAfterConfirm) {
                        setDestinationSubmitAfterConfirm(false);
                        void form.handleSubmit();
                      }
                    }}
                  />
                ) : null}

                {serverError ? (
                  <p className="mt-4 text-sm text-danger" role="alert">
                    {serverError}
                  </p>
                ) : null}

                {/* Desktop CTAs — hidden on mobile (moved to sticky footer below) */}
                {showFormCtas && (
                  <div className="mt-6 hidden flex-col-reverse gap-2.5 md:flex md:flex-row md:justify-end">
                    <Link
                      href="/dashboard"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "inline-flex h-[46px] rounded-[11px] border-line bg-card px-[22px] text-[14.5px] font-semibold text-mute hover:bg-surface-soft",
                      )}
                    >
                      {INCOME_CANCEL_CTA}
                    </Link>
                    <form.Subscribe
                      selector={(state) =>
                        [state.canSubmit, state.isSubmitting] as const
                      }
                    >
                      {([canSubmit, isSubmitting]) => (
                        <Button
                          type="submit"
                          disabled={!canSubmit || isSubmitting}
                          className="h-[46px] rounded-[11px] bg-ink px-[26px] text-[14.5px] font-semibold text-canvas hover:bg-ink/90"
                        >
                          {isSubmitting ? "Registrando…" : submitLabel}
                        </Button>
                      )}
                    </form.Subscribe>
                  </div>
                )}

                {/* Mobile sticky footer CTAs — hidden on md+ */}
                {showFormCtas && (
                  <form.Subscribe
                    selector={(state) =>
                      [state.canSubmit, state.isSubmitting] as const
                    }
                  >
                    {([canSubmit, isSubmitting]) => (
                      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-line bg-canvas/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur-md md:hidden">
                        <Link
                          href="/dashboard"
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "inline-flex h-[44px] flex-1 rounded-[11px] border-line bg-card text-[14px] font-semibold text-mute hover:bg-surface-soft",
                          )}
                        >
                          {INCOME_CANCEL_CTA}
                        </Link>
                        <Button
                          type="submit"
                          disabled={!canSubmit || isSubmitting}
                          className="h-[44px] flex-1 rounded-[11px] bg-ink text-[14px] font-semibold text-canvas hover:bg-ink/90"
                        >
                          {isSubmitting ? "Registrando…" : submitLabel}
                        </Button>
                      </div>
                    )}
                  </form.Subscribe>
                )}
              </>
            );
          }}
        </form.Subscribe>
      </form>
    </>
  );
}

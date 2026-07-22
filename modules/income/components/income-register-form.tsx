"use client";

import { useForm } from "@tanstack/react-form";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { fromConvexError } from "@/core/errors";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import type { DistributionPolicy } from "@/shared/lib/allocations";
import type { ExtraordinaryType } from "@/shared/lib/extraordinaryIncome";
import { limaStartOfDay } from "@/shared/lib/date";
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
import {
  createIncomeRegisterSchema,
  type IncomeRegisterFormValues,
} from "../schemas";
import type { IncomeRegisterResult, IncomeSource } from "../types";
import { IncomeDestinationDialog } from "./income-destination-dialog";
import { IncomeExtraordinaryDetailsFields } from "./income-extraordinary-details-fields";
import { IncomeExtraordinaryRuleBanner } from "./income-extraordinary-rule-banner";
import { IncomeExtraordinaryTypeGrid } from "./income-extraordinary-type-grid";
import { IncomeImpactPreview } from "./income-impact-preview";
import { IncomeKindToggle } from "./income-kind-toggle";
import { IncomeRegisterHabitualFields } from "./income-register-habitual-fields";
import type { IncomeFormField } from "./income-form-field";

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
          });
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
        });
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
  };

  return (
    <form
      className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(state) => state.values}>
        {(values) => {
          const isExtraordinary = values.incomeKind === "extraordinary";
          const showPick =
            isExtraordinary && extraStep === "pickType";
          const showDetails =
            isExtraordinary &&
            extraStep === "details" &&
            values.extraordinaryType;

          const subtitle = isExtraordinary
            ? showPick
              ? INCOME_PAGE_SUBTITLE_KIND
              : INCOME_EXTRAORDINARY_DETAILS_SUBTITLE
            : INCOME_PAGE_SUBTITLE;

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
                })
              : null;

          const submitLabel =
            isExtraordinary && values.extraordinaryType
              ? getExtraordinarySubmitCta(values.extraordinaryType)
              : INCOME_SUBMIT_CTA;

          return (
            <>
              {!showDetails ? (
                <div className="mb-6 md:mb-8">
                  <h1 className="font-serif text-[27px] font-medium text-ink">
                    {INCOME_PAGE_TITLE}
                  </h1>
                  <p className="mt-1 text-[13.5px] text-mute">{subtitle}</p>
                </div>
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
                    {isExtraordinary && showDetails && values.extraordinaryType ? (
                      <form.Field name="amountCents">
                        {(amountField) => (
                          <form.Field name="occurredAt">
                            {(occurredAtField) => (
                              <form.Field name="extraordinaryLabel">
                                {(labelField) => (
                                  <IncomeExtraordinaryDetailsFields
                                    currencyCode={currencyCode}
                                    extraordinaryType={values.extraordinaryType!}
                                    amountField={amountField}
                                    occurredAtField={occurredAtField}
                                    labelField={
                                      labelField as IncomeFormField<"extraordinaryLabel">
                                    }
                                  />
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
                                      <IncomeRegisterHabitualFields
                                        currencyCode={currencyCode}
                                        amountField={amountField}
                                        occurredAtField={occurredAtField}
                                        sourceField={sourceField}
                                        conceptField={conceptField}
                                      />
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

              {(!isExtraordinary || showDetails) && (
                <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
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
            </>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

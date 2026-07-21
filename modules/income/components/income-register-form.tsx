"use client";

import { useForm } from "@tanstack/react-form";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { fromConvexError } from "@/core/errors";
import { ExpenseKeypad } from "@/modules/expenses/components/expense-keypad";
import { formatKeypadDisplay } from "@/modules/expenses/lib/keypad";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { limaStartOfDay } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";
import {
  getIncomeSourceLabel,
  INCOME_AMOUNT_LABEL,
  INCOME_CANCEL_CTA,
  INCOME_CONCEPT_LABEL,
  INCOME_CONCEPT_OPTIONAL,
  INCOME_PAGE_SUBTITLE,
  INCOME_PAGE_TITLE,
  INCOME_SOURCE_LABEL,
  INCOME_SUBMIT_CTA,
} from "../constants";
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
import { IncomeDatePicker } from "./income-date-picker";
import { IncomeImpactPreview } from "./income-impact-preview";
import { IncomeSourceChips } from "./income-source-chips";

type DashboardSummary = FunctionReturnType<typeof api.dashboard.getSummary>;

type Props = {
  currencyCode: string;
  currencySymbol: string;
  profile: Doc<"profiles">;
  summary: DashboardSummary | undefined;
  onSuccess: (result: IncomeRegisterResult) => void;
  createIncomeEvent: (args: {
    amount: number;
    source: IncomeSource;
    description: string;
    occurredAt: number;
  }) => Promise<IncomeRegisterResult>;
};

export function IncomeRegisterForm({
  currencyCode,
  currencySymbol,
  profile,
  summary,
  onSuccess,
  createIncomeEvent,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const formSchema = useMemo(() => createIncomeRegisterSchema(), []);

  const form = useForm({
    defaultValues: {
      amountCents: 0,
      source: "payroll" as IncomeSource,
      concept: "",
      occurredAt: limaStartOfDay(),
    } satisfies IncomeRegisterFormValues,
    validators: {
      onChange: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        const description = buildIncomeDescription(
          getIncomeSourceLabel(value.source),
          value.concept,
        );
        const response = await createIncomeEvent({
          amount: value.amountCents,
          source: value.source,
          description,
          occurredAt: value.occurredAt,
        });
        onSuccess(response);
      } catch (error) {
        setServerError(fromConvexError(error).message);
      }
    },
  });

  return (
    <form
      className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="mb-6 md:mb-8">
        <h1 className="font-serif text-[27px] font-medium text-ink md:text-[27px]">
          {INCOME_PAGE_TITLE}
        </h1>
        <p className="mt-1 text-[13.5px] text-mute">{INCOME_PAGE_SUBTITLE}</p>
      </div>

      <form.Subscribe
        selector={(state) => ({
          amountCents: state.values.amountCents,
          allocationNeeds: profile.allocationNeeds,
          allocationWants: profile.allocationWants,
          allocationSavings: profile.allocationSavings,
          incomeModel: profile.incomeModel,
          payFrequency: profile.payFrequency,
          cycleDurationDays: profile.cycleDurationDays,
          daysRemaining: summary?.cycle?.daysRemaining,
          envelopes: summary?.envelopes,
        })}
      >
        {(previewDeps) => {
          const previewInput =
            previewDeps.amountCents > 0
              ? computeImpactPreview({
                  amountCents: previewDeps.amountCents,
                  weights: {
                    allocationNeeds: previewDeps.allocationNeeds,
                    allocationWants: previewDeps.allocationWants,
                    allocationSavings: previewDeps.allocationSavings,
                  },
                  currentEnvelopes: {
                    needs:
                      previewDeps.envelopes?.find(
                        (envelope) => envelope.type === "needs",
                      )?.remainingAmount ?? 0,
                    wants:
                      previewDeps.envelopes?.find(
                        (envelope) => envelope.type === "wants",
                      )?.remainingAmount ?? 0,
                    savings:
                      previewDeps.envelopes?.find(
                        (envelope) => envelope.type === "savings",
                      )?.remainingAmount ?? 0,
                  },
                  daysRemaining:
                    previewDeps.daysRemaining ??
                    resolveCycleDaysForPreview({
                      incomeModel: previewDeps.incomeModel,
                      payFrequency: previewDeps.payFrequency,
                      cycleDurationDays: previewDeps.cycleDurationDays,
                    }),
                })
              : null;

          return (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-7">
              <div className="space-y-5">
                <form.Field name="amountCents">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel className="mb-2 block text-[12.5px] font-medium text-ink-secondary">
                          {INCOME_AMOUNT_LABEL}
                        </FieldLabel>
                        <div className="rounded-[14px] border border-line bg-card px-5 py-4">
                          <p className="font-serif text-[34px] leading-none text-ink">
                            {formatKeypadDisplay(
                              field.state.value,
                              currencySymbol,
                            )}
                          </p>
                        </div>
                        <div className="mt-3">
                          <ExpenseKeypad
                            amountCents={field.state.value}
                            onChange={(cents) => {
                              field.handleChange(cents);
                              field.handleBlur();
                            }}
                          />
                        </div>
                        {isInvalid ? (
                          <FieldError
                            className="mt-2"
                            errors={field.state.meta.errors}
                          />
                        ) : null}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field name="source">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel className="mb-2.5 block text-[12.5px] font-medium text-ink-secondary">
                          {INCOME_SOURCE_LABEL}
                        </FieldLabel>
                        <IncomeSourceChips
                          value={field.state.value}
                          onChange={(source) => {
                            field.handleChange(source);
                            field.handleBlur();
                          }}
                        />
                        {isInvalid ? (
                          <FieldError
                            className="mt-2"
                            errors={field.state.meta.errors}
                          />
                        ) : null}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field name="occurredAt">
                  {(field) => (
                    <IncomeDatePicker
                      value={field.state.value}
                      onChange={(timestamp) => {
                        field.handleChange(timestamp);
                        field.handleBlur();
                      }}
                    />
                  )}
                </form.Field>

                <form.Field name="concept">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel
                          htmlFor="income-concept"
                          className="mb-2 block text-[12.5px] font-medium text-ink-secondary"
                        >
                          {INCOME_CONCEPT_LABEL}{" "}
                          <span className="font-normal text-mute">
                            {INCOME_CONCEPT_OPTIONAL}
                          </span>
                        </FieldLabel>
                        <Input
                          id="income-concept"
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="Ej. pago de cliente"
                          aria-invalid={isInvalid}
                          className="h-[46px] rounded-[11px] border-line bg-card text-[14.5px]"
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </form.Field>
              </div>

              <IncomeImpactPreview
                preview={previewInput}
                currencyCode={currencyCode}
              />
            </div>
          );
        }}
      </form.Subscribe>

      {serverError ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {serverError}
        </p>
      ) : null}

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
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="h-[46px] rounded-[11px] bg-ink px-[26px] text-[14.5px] font-semibold text-canvas hover:bg-ink/90"
            >
              {isSubmitting ? "Registrando…" : INCOME_SUBMIT_CTA}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}

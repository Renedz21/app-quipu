"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Lock } from "reicon-react/icons/Lock";
import { Button } from "@/shared/components/ui/button";
import { Slider } from "@/shared/components/ui/slider";
import { ENVELOPE_LABELS } from "@/shared/constants/envelopes";
import { formatCents } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import {
  MOVE_SURPLUS_AMOUNT_AVAILABLE_PREFIX,
  MOVE_SURPLUS_AMOUNT_AVAILABLE_SUFFIX,
  MOVE_SURPLUS_AMOUNT_LABEL,
  MOVE_SURPLUS_CANCEL_CTA,
  MOVE_SURPLUS_CYCLE_BANNER_EMPHASIS,
  MOVE_SURPLUS_CYCLE_BANNER_REST,
  MOVE_SURPLUS_DESTINATION_FUND_HINT,
  MOVE_SURPLUS_DESTINATION_GOAL_HINT,
  MOVE_SURPLUS_DESTINATION_LABEL,
  MOVE_SURPLUS_GRATIFICATION_LABEL,
  MOVE_SURPLUS_PILL_ALL_SUFFIX,
  MOVE_SURPLUS_SOURCE_LABEL,
  MOVE_SURPLUS_SUBMIT_CTA_PREFIX,
  MOVE_SURPLUS_WANTS_SURPLUS_PREFIX,
} from "../constants";
import {
  createMoveSurplusFormSchema,
  type MoveSurplusFormValues,
  type SurplusFromEnvelope,
} from "../schemas";

export type MoveSurplusDestination = {
  id: Id<"subEnvelopes">;
  label: string;
  isSystemDefault: boolean;
};

export type MoveSurplusSources = Record<
  SurplusFromEnvelope,
  { availableCents: number }
>;

type Props = {
  currencyCode: string;
  sources: MoveSurplusSources;
  destinations: MoveSurplusDestination[];
  initialFrom?: SurplusFromEnvelope;
  initialAmountCents?: number;
  initialDestinationId?: Id<"subEnvelopes">;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: MoveSurplusFormValues) => void | Promise<void>;
};

const SOURCE_ORDER: SurplusFromEnvelope[] = ["wants", "needs", "extraordinary"];

function pickDefaultSource(
  sources: MoveSurplusSources,
  preferred?: SurplusFromEnvelope,
): SurplusFromEnvelope | null {
  if (preferred && sources[preferred].availableCents > 0) return preferred;
  for (const key of SOURCE_ORDER) {
    if (sources[key].availableCents > 0) return key;
  }
  return null;
}

function sourceLabel(
  source: SurplusFromEnvelope,
  availableCents: number,
  currencyCode: string,
): string {
  if (source === "wants") {
    return `${MOVE_SURPLUS_WANTS_SURPLUS_PREFIX} ${formatCents(availableCents, { currency: currencyCode })}`;
  }
  if (source === "extraordinary") {
    return MOVE_SURPLUS_GRATIFICATION_LABEL;
  }
  return ENVELOPE_LABELS[source];
}

export function MoveSurplusForm({
  currencyCode,
  sources,
  destinations,
  initialFrom,
  initialAmountCents,
  initialDestinationId,
  isSubmitting,
  onCancel,
  onSubmit,
}: Props) {
  const defaultSource = pickDefaultSource(sources, initialFrom);
  const preferredDestination =
    initialDestinationId &&
    destinations.some((destination) => destination.id === initialDestinationId)
      ? initialDestinationId
      : undefined;
  const defaultDestination =
    preferredDestination ??
    destinations.find((d) => d.isSystemDefault)?.id ??
    destinations[0]?.id ??
    "";

  const defaultAvailable =
    defaultSource != null ? sources[defaultSource].availableCents : 0;
  const defaultAmountCents =
    initialAmountCents != null && initialAmountCents > 0
      ? Math.min(initialAmountCents, defaultAvailable)
      : defaultAvailable;

  const availableBySource = useMemo(
    () => ({
      needs: sources.needs.availableCents,
      wants: sources.wants.availableCents,
      extraordinary: sources.extraordinary.availableCents,
    }),
    [sources],
  );

  const formSchema = useMemo(
    () => createMoveSurplusFormSchema(availableBySource),
    [availableBySource],
  );

  const form = useForm({
    defaultValues: {
      fromSource: defaultSource ?? "wants",
      amountCents: defaultAmountCents,
      destinationId: defaultDestination,
    },
    validators: {
      onChange: formSchema as never,
      onSubmit: formSchema as never,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  if (!defaultSource) return null;

  return (
    <div className="space-y-6 md:mt-6">
      <form.Subscribe
        selector={(state) => ({
          fromSource: state.values.fromSource,
          amountCents: state.values.amountCents,
          destinationId: state.values.destinationId,
        })}
      >
        {({ fromSource, amountCents, destinationId }) => {
          const available = availableBySource[fromSource];
          const sliderMax = Math.max(available, 1);
          const sliderValue = Math.min(amountCents, available);

          return (
            <>
              <section>
                <p className="mb-2.5 text-[12.5px] font-medium text-ink-secondary">
                  {MOVE_SURPLUS_SOURCE_LABEL}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_ORDER.map((source) => {
                    const sourceAvailable = sources[source].availableCents;
                    const selected = fromSource === source;
                    return (
                      <button
                        key={source}
                        type="button"
                        disabled={sourceAvailable <= 0}
                        onClick={() => {
                          form.setFieldValue("fromSource", source);
                          form.setFieldValue("amountCents", sourceAvailable);
                        }}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-[11px] border px-3.5 py-2.5 text-sm transition-colors",
                          selected
                            ? "border-moss bg-qp-success font-semibold text-qp-deep"
                            : "border-line bg-card text-ink-secondary hover:bg-surface-soft",
                          sourceAvailable <= 0 &&
                            "cursor-not-allowed opacity-40",
                        )}
                      >
                        <SourceDot source={source} />
                        {sourceLabel(source, sourceAvailable, currencyCode)}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <p className="mb-2.5 text-[12.5px] font-medium text-ink-secondary">
                  {MOVE_SURPLUS_AMOUNT_LABEL}
                </p>
                <div className="flex h-16 items-center justify-between rounded-xl border border-qp-shield-line bg-card px-5">
                  <span className="font-serif text-[34px] leading-none text-ink">
                    {formatCents(sliderValue, { currency: currencyCode })}
                  </span>
                  <span className="text-[13px] text-faint">
                    {MOVE_SURPLUS_AMOUNT_AVAILABLE_PREFIX}{" "}
                    {formatCents(available, { currency: currencyCode })}{" "}
                    {MOVE_SURPLUS_AMOUNT_AVAILABLE_SUFFIX}
                  </span>
                </div>
                {available > 0 ? (
                  <div className="mt-3.5">
                    <Slider
                      min={0}
                      max={sliderMax}
                      value={[sliderValue]}
                      onValueChange={(values) => {
                        const next = Array.isArray(values)
                          ? (values[0] ?? 0)
                          : values;
                        form.setFieldValue("amountCents", next);
                      }}
                      className="[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-moss-soft [&_[data-slot=slider-range]]:to-moss"
                    />
                  </div>
                ) : null}
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {[10_000, 30_000].map((increment) => (
                    <button
                      key={increment}
                      type="button"
                      disabled={available <= 0}
                      onClick={() =>
                        form.setFieldValue(
                          "amountCents",
                          Math.min(available, amountCents + increment),
                        )
                      }
                      className="rounded-[10px] border border-line bg-card px-3.5 py-2 text-[13px] text-ink-secondary"
                    >
                      + {formatCents(increment, { currency: currencyCode })}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={available <= 0}
                    onClick={() => form.setFieldValue("amountCents", available)}
                    className={cn(
                      "rounded-[10px] border px-3.5 py-2 text-[13px]",
                      amountCents === available
                        ? "border-moss bg-qp-success font-semibold text-qp-deep"
                        : "border-line bg-card text-ink-secondary",
                    )}
                  >
                    {MOVE_SURPLUS_PILL_ALL_SUFFIX} ·{" "}
                    {formatCents(available, { currency: currencyCode })}
                  </button>
                </div>
              </section>

              <section>
                <p className="mb-2.5 text-[12.5px] font-medium text-ink-secondary">
                  {MOVE_SURPLUS_DESTINATION_LABEL}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {destinations.map((destination) => {
                    const selected = destinationId === destination.id;
                    const isFund = destination.isSystemDefault;
                    return (
                      <button
                        key={destination.id}
                        type="button"
                        onClick={() =>
                          form.setFieldValue("destinationId", destination.id)
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                          selected
                            ? "border-moss bg-qp-success"
                            : "border-line/70 bg-card hover:bg-surface-warm/40",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-[30px] shrink-0 items-center justify-center rounded-[9px]",
                            isFund ? "bg-moss text-white" : "bg-line-section",
                          )}
                        >
                          {isFund ? (
                            <Lock size={13} aria-hidden />
                          ) : (
                            <span className="size-3 rounded-full border-2 border-mute" />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {destination.label}
                          </p>
                          <p className="text-xs text-qp-text">
                            {isFund
                              ? MOVE_SURPLUS_DESTINATION_FUND_HINT
                              : MOVE_SURPLUS_DESTINATION_GOAL_HINT}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div className="flex items-start gap-2.5 rounded-xl border border-qp-shield-line bg-qp-success px-4 py-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.6px] border-qp-deep">
                  <span className="mb-0.5 block size-1 rotate-45 border-r-[1.6px] border-b-[1.6px] border-qp-deep" />
                </span>
                <p className="text-[13px] leading-relaxed text-qp-deep">
                  <strong className="font-semibold">
                    {MOVE_SURPLUS_CYCLE_BANNER_EMPHASIS}
                  </strong>{" "}
                  {MOVE_SURPLUS_CYCLE_BANNER_REST}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-[11px]"
                  disabled={isSubmitting}
                  onClick={onCancel}
                >
                  {MOVE_SURPLUS_CANCEL_CTA}
                </Button>
                <Button
                  type="button"
                  onClick={() => void form.handleSubmit()}
                  className="h-11 rounded-[11px]"
                  disabled={
                    isSubmitting ||
                    amountCents <= 0 ||
                    amountCents > available ||
                    !destinationId
                  }
                >
                  {MOVE_SURPLUS_SUBMIT_CTA_PREFIX}{" "}
                  {formatCents(sliderValue, { currency: currencyCode })}
                </Button>
              </div>
            </>
          );
        }}
      </form.Subscribe>
    </div>
  );
}

function SourceDot({ source }: { source: SurplusFromEnvelope }) {
  if (source === "wants") {
    return <span className="size-2 rounded-full bg-clay" aria-hidden />;
  }
  if (source === "needs") {
    return <span className="size-2 rounded-full bg-needs" aria-hidden />;
  }
  return (
    <span
      className="size-2 rotate-45 rounded-sm bg-extraordinary-a"
      aria-hidden
    />
  );
}

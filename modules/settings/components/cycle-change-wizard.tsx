"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fromConvexError } from "@/core/errors";
import { useMyProfile } from "@/modules/auth/hooks/use-my-profile";
import { CheckMark } from "@/modules/onboarding/components/check-mark";
import { DAY_PILLS } from "@/modules/onboarding/constants";
import { BackLink } from "@/shared/components/ui/back-link";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useUpdateCycleSchedule } from "../actions";
import {
  SETTINGS_CYCLE_WIZARD_BACK,
  SETTINGS_CYCLE_WIZARD_CONFIRM,
  SETTINGS_CYCLE_WIZARD_NEXT,
  SETTINGS_CYCLE_WIZARD_SAVED,
  SETTINGS_CYCLE_WIZARD_STEP1_BODY,
  SETTINGS_CYCLE_WIZARD_STEP1_TITLE,
  SETTINGS_CYCLE_WIZARD_STEP2_TITLE,
  SETTINGS_SYSTEM_HEADING,
} from "../constants";
import {
  formatCycleStart,
  formatCycleType,
  formatIncomeProfileLabel,
} from "../lib/cycle-display";

type Step = 1 | 2 | 3;

export function CycleChangeWizard() {
  const profile = useMyProfile();
  const router = useRouter();
  const updateCycle = useUpdateCycleSchedule();
  const [step, setStep] = useState<Step>(1);
  const [payFrequency, setPayFrequency] = useState<"monthly" | "biweekly">(
    "monthly",
  );
  const [paydays, setPaydays] = useState<number[]>([]);
  const [cycleDurationDays, setCycleDurationDays] = useState<15 | 30>(30);
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!profile || hydrated) return;
    if (
      profile.payFrequency === "monthly" ||
      profile.payFrequency === "biweekly"
    ) {
      setPayFrequency(profile.payFrequency);
    }
    if (profile.paydays?.length) setPaydays([...profile.paydays]);
    if (profile.cycleDurationDays === 15 || profile.cycleDurationDays === 30) {
      setCycleDurationDays(profile.cycleDurationDays);
    }
    setHydrated(true);
  }, [profile, hydrated]);

  if (!profile) {
    return (
      <div className="mx-auto h-40 max-w-lg animate-pulse rounded-2xl bg-surface" />
    );
  }

  const isVariable = profile.incomeModel === "variable";
  const isBiweekly = payFrequency === "biweekly";

  function selectDay(day: number) {
    if (isBiweekly) {
      if (paydays.includes(day)) {
        const next = paydays.filter((d) => d !== day);
        setPaydays(next.length ? next : [day]);
      } else if (paydays.length >= 2) {
        const first = paydays[1];
        setPaydays(first !== undefined ? [first, day] : [day]);
      } else {
        setPaydays([...paydays, day]);
      }
    } else {
      setPaydays([day]);
    }
  }

  async function confirmSave() {
    setPending(true);
    try {
      if (isVariable) {
        await updateCycle({ cycleDurationDays });
      } else {
        await updateCycle({ payFrequency, paydays });
      }
      toast.success(SETTINGS_CYCLE_WIZARD_SAVED);
      router.push("/settings/system");
    } catch (error) {
      toast.error(fromConvexError(error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-5 py-6">
      <BackLink
        href="/settings/system"
        className="text-[12.5px] text-mute hover:text-ink"
      >
        {SETTINGS_SYSTEM_HEADING}
      </BackLink>

      {step === 1 ? (
        <>
          <h1 className="mt-3 font-serif text-[23px] font-medium text-ink">
            {SETTINGS_CYCLE_WIZARD_STEP1_TITLE}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-mute-subtle">
            {SETTINGS_CYCLE_WIZARD_STEP1_BODY}
          </p>
          <dl className="mt-6 space-y-3 rounded-2xl border border-line bg-card px-4 py-4">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-faint">
                Perfil
              </dt>
              <dd className="text-sm font-semibold text-ink">
                {formatIncomeProfileLabel(profile)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-faint">
                Tipo
              </dt>
              <dd className="text-sm font-semibold text-ink">
                {formatCycleType(profile)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-faint">
                Inicio habitual
              </dt>
              <dd className="text-sm font-semibold text-ink">
                {formatCycleStart(profile)}
              </dd>
            </div>
          </dl>
          <Button
            type="button"
            className="mt-6 w-full"
            onClick={() => setStep(2)}
          >
            {SETTINGS_CYCLE_WIZARD_NEXT}
          </Button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h1 className="mt-3 font-serif text-[23px] font-medium text-ink">
            {SETTINGS_CYCLE_WIZARD_STEP2_TITLE}
          </h1>
          {isVariable ? (
            <div className="mt-6 flex gap-3">
              {([15, 30] as const).map((days) => {
                const selected = cycleDurationDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setCycleDurationDays(days)}
                    className={cn(
                      "flex-1 rounded-xl border px-4 py-4 text-left transition-colors",
                      selected
                        ? "border-qp bg-qp-soft"
                        : "border-line bg-card hover:bg-surface-warm",
                    )}
                  >
                    <div className="font-semibold text-ink">{days} días</div>
                    <div className="text-[12px] text-mute">Por ciclo</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="mt-6 flex gap-3">
                {(["monthly", "biweekly"] as const).map((freq) => {
                  const selected = payFrequency === freq;
                  return (
                    <button
                      key={freq}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setPayFrequency(freq);
                        setPaydays([]);
                      }}
                      className={cn(
                        "flex-1 rounded-xl border px-4 py-3 text-left",
                        selected
                          ? "border-qp bg-qp-soft"
                          : "border-line bg-card",
                      )}
                    >
                      <div className="text-sm font-semibold text-ink">
                        {freq === "monthly" ? "Mensual" : "Quincenal"}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-[13px] text-mute">
                Día{isBiweekly ? "s" : ""} de pago
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAY_PILLS.map((day) => {
                  const selected = paydays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectDay(day)}
                      className={cn(
                        "relative flex size-10 items-center justify-center rounded-full border text-sm font-medium",
                        selected
                          ? "border-qp bg-qp-soft text-qp-deep"
                          : "border-line bg-card text-ink-secondary",
                      )}
                    >
                      {day}
                      {selected ? (
                        <CheckMark className="absolute -right-0.5 -top-0.5" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className="mt-8 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-line"
              onClick={() => setStep(1)}
            >
              {SETTINGS_CYCLE_WIZARD_BACK}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!isVariable && paydays.length === 0}
              onClick={() => setStep(3)}
            >
              {SETTINGS_CYCLE_WIZARD_NEXT}
            </Button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h1 className="mt-3 font-serif text-[23px] font-medium text-ink">
            Confirmar
          </h1>
          <p className="mt-2 text-[13px] text-mute-subtle">
            {isVariable
              ? `Próximos ciclos de ${cycleDurationDays} días.`
              : `${payFrequency === "monthly" ? "Mensual" : "Quincenal"} · días ${paydays.join(", ")}.`}
          </p>
          <div className="mt-8 flex flex-col gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() => void confirmSave()}
            >
              {SETTINGS_CYCLE_WIZARD_CONFIRM}
            </Button>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "ghost" }), "text-mute")}
              onClick={() => setStep(2)}
            >
              {SETTINGS_CYCLE_WIZARD_BACK}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

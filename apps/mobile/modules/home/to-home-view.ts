import { formatSoles } from "@/shared/lib/onboarding/daily";
import type {
  Allocations,
  DashboardEnvelope,
  DashboardMovement,
  DashboardSummary,
  EnvelopeType,
  HomeEnvelopeView,
  HomeMovementView,
  HomeTone,
  HomeView,
  StatusBadge,
} from "./types";

const ENVELOPE_ORDER: EnvelopeType[] = ["needs", "wants", "savings"];

const ENVELOPE_LABEL: Record<EnvelopeType, string> = {
  needs: "Necesidades",
  wants: "Gustos",
  savings: "Ahorro",
};

const BADGE_LABEL: Record<StatusBadge, string> = {
  stable: "Estable",
  attention: "Atención",
  risk: "En riesgo",
  starting: "Recién empiezas",
};

const DEFAULT_HERO_HINT = "Sin tocar tus compromisos ni tu ahorro.";
const EMPTY_HERO_HINT =
  "Registra tu ingreso y Quipu lo divide en tus tres sobres. Recién ahí sabrás cuánto puedes gastar hoy.";
const EMPTY_COACH = "Empecemos por tu sueldo. Lo demás se acomoda solo.";
const EMPTY_CYCLE_HINT = "El ciclo empieza con tu primer ingreso";

const MONTH_FORMATTER = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  timeZone: "America/Lima",
});

function envelopeFromLabel(label: string | undefined): HomeTone {
  if (label === "needs" || label === "Necesidades") return "needs";
  if (label === "wants" || label === "Gustos") return "wants";
  if (label === "savings" || label === "Ahorro") return "savings";
  return "needs";
}

function formatAllocatedSuffix(allocatedCents: number): string {
  return `de ${(allocatedCents / 100).toLocaleString("es-PE")}`;
}

function mapActiveEnvelope(envelope: DashboardEnvelope): HomeEnvelopeView {
  const isSavings = envelope.type === "savings";
  const displayCents = isSavings
    ? envelope.remainingAmount > 0
      ? envelope.remainingAmount
      : envelope.allocatedAmount
    : Math.max(0, envelope.remainingAmount);

  return {
    type: envelope.type,
    label: ENVELOPE_LABEL[envelope.type],
    amountLabel: formatSoles(displayCents),
    suffix: isSavings
      ? "apartado"
      : formatAllocatedSuffix(envelope.allocatedAmount),
    progress: envelope.percentRemaining,
    tone: envelope.type,
  };
}

function mapMovement(movement: DashboardMovement): HomeMovementView {
  const soles = (movement.amount / 100).toFixed(2);
  const sign = movement.kind === "income" ? "+" : "–";
  return {
    id: movement.id,
    name: movement.label,
    amountLabel: `${sign} S/ ${soles}`,
    tone: envelopeFromLabel(movement.envelopeLabel),
  };
}

function emptyEnvelopes(allocations: Allocations): HomeEnvelopeView[] {
  return ENVELOPE_ORDER.map((type) => ({
    type,
    label: ENVELOPE_LABEL[type],
    amountLabel: "S/ —",
    suffix: `${allocations[type]}%`,
    progress: 0,
    tone: type,
  }));
}

function emptyView(allocations: Allocations): HomeView {
  return {
    kind: "empty",
    cycleLabel: "Sin ciclo activo",
    badge: { label: "En espera", tone: "wait" },
    heroHint: EMPTY_HERO_HINT,
    cycleHint: EMPTY_CYCLE_HINT,
    envelopes: emptyEnvelopes(allocations),
    coachMessage: EMPTY_COACH,
  };
}

function cycleLine(
  startDate: number,
  daysElapsed: number,
  daysTotal: number,
): string {
  const month = MONTH_FORMATTER.format(new Date(startDate)).toLocaleLowerCase(
    "es-PE",
  );
  return `Ciclo ${month} · Día ${daysElapsed} / ${daysTotal}`;
}

export function toHomeView(
  summary: DashboardSummary | null | undefined,
  allocations: Allocations,
): HomeView {
  if (!summary?.cycle || !summary.hero) {
    return emptyView(allocations);
  }

  const { cycle, hero } = summary;
  const spendableCents =
    summary.liquidity?.spendableCents ?? hero.spendableCents;

  return {
    kind: "active",
    cycleLabel: cycleLine(cycle.startDate, cycle.daysElapsed, cycle.daysTotal),
    badge: {
      label: BADGE_LABEL[hero.statusBadge],
      tone: hero.statusBadge,
    },
    dailyCents: hero.displayDailyCents,
    heroHint: hero.bodyCopy ?? hero.validationCopy ?? DEFAULT_HERO_HINT,
    daysRemainingLabel: `${cycle.daysRemaining} días restantes`,
    envelopesTotalLabel: `${formatSoles(spendableCents)} en sobres`,
    cycleProgress: cycle.progressPercent,
    envelopes: ENVELOPE_ORDER.map((type) => {
      const found = summary.envelopes.find(
        (envelope) => envelope.type === type,
      );
      return found
        ? mapActiveEnvelope(found)
        : {
            type,
            label: ENVELOPE_LABEL[type],
            amountLabel: "S/ —",
            suffix: `${allocations[type]}%`,
            progress: 0,
            tone: type,
          };
    }),
    coachMessage: summary.coach?.message ?? EMPTY_COACH,
    movements: summary.movements.map(mapMovement),
  };
}

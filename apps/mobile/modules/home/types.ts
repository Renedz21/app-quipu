export type EnvelopeType = "needs" | "wants" | "savings";

export type HomeTone = EnvelopeType;

export type StatusBadge = "stable" | "attention" | "risk" | "starting";

export type Allocations = {
  needs: number;
  wants: number;
  savings: number;
};

export type DashboardEnvelope = {
  type: EnvelopeType;
  remainingAmount: number;
  allocatedAmount: number;
  percentRemaining: number;
};

export type DashboardMovement = {
  id: string;
  kind: "expense" | "income";
  label: string;
  envelopeLabel?: string;
  amount: number;
  timestamp: number;
};

export type DashboardHero = {
  dailyAvailableCents: number;
  displayDailyCents: number;
  bodyCopy?: string;
  validationCopy?: string;
  statusBadge: StatusBadge;
  spendableCents: number;
  reservedCents: number;
  unallocatedCents: number;
};

export type DashboardCycle = {
  id: string;
  startDate: number;
  endDate: number;
  daysTotal: number;
  daysRemaining: number;
  daysElapsed: number;
  progressPercent: number;
  needsReview?: boolean;
  unallocatedCents?: number;
};

export type DashboardCoach = {
  kind: string;
  message: string;
};

export type DashboardSummary = {
  profile: { name?: string; currencyCode: string; plan: string };
  cycle: DashboardCycle | null;
  hero: DashboardHero | null;
  liquidity?: {
    spendableCents: number;
    reservedCents: number;
    unallocatedCents: number;
    savingsParkedInEnvelopeCents: number;
  };
  envelopes: DashboardEnvelope[];
  commitments: unknown[];
  coach: DashboardCoach | null;
  movements: DashboardMovement[];
  isEarlyCycle: boolean;
};

export type HomeEnvelopeView = {
  type: EnvelopeType;
  label: string;
  amountLabel: string;
  suffix: string;
  progress: number;
  tone: HomeTone;
};

export type HomeMovementView = {
  id: string;
  name: string;
  amountLabel: string;
  tone: HomeTone;
};

export type HomeBadgeTone = StatusBadge | "wait";

export type HomeBadge = {
  label: string;
  tone: HomeBadgeTone;
};

type HomeViewBase = {
  cycleLabel: string;
  badge: HomeBadge;
  heroHint: string;
  envelopes: HomeEnvelopeView[];
  coachMessage: string;
};

export type EmptyHomeView = HomeViewBase & {
  kind: "empty";
  cycleHint: string;
};

export type ActiveHomeView = HomeViewBase & {
  kind: "active";
  dailyCents: number;
  daysRemainingLabel: string;
  envelopesTotalLabel: string;
  cycleProgress: number;
  movements: HomeMovementView[];
};

export type HomeView = EmptyHomeView | ActiveHomeView;

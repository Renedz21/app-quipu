type V2WorkerType = "dependent" | "independent";

export function backfillIncomeModel(profile: {
  workerType?: V2WorkerType;
}): "fixed" | "variable" {
  if (profile.workerType === "dependent") return "fixed";
  return "variable";
}

type V2CommitmentFrequency =
  | "monthly"
  | "first_payday"
  | "second_payday"
  | "every_payday";

const FALLBACK_DUE_DAY = 1;

export function backfillCommitmentDueDay(input: {
  frequency: V2CommitmentFrequency;
  paydays?: number[];
}): number {
  if (input.frequency === "monthly") return FALLBACK_DUE_DAY;
  if (!input.paydays || input.paydays.length === 0) return FALLBACK_DUE_DAY;
  if (input.frequency === "first_payday") return input.paydays[0]!;
  if (input.frequency === "second_payday")
    return input.paydays[1] ?? input.paydays[0]!;
  // every_payday: lossy. Pick the first.
  return input.paydays[0]!;
}

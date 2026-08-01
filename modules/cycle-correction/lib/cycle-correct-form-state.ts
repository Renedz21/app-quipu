export type CycleCorrectFormState = {
  cycleId: string | null;
  needsText: string;
  wantsText: string;
  savingsText: string;
  unallocatedText: string;
  reserveText: string;
  contributeText: string;
  annulInferredText: string;
  contributeKind: "objective" | "additional";
  selectedCommitmentId: string;
  serverError: string | null;
  saving: boolean;
};

export type CycleCorrectFormAction =
  | {
      type: "hydrate";
      cycleId: string;
      needsText: string;
      wantsText: string;
      savingsText: string;
      unallocatedText: string;
      reserveText: string;
      selectedCommitmentId: string;
    }
  | {
      type: "setField";
      field:
        | "needsText"
        | "wantsText"
        | "savingsText"
        | "unallocatedText"
        | "reserveText"
        | "contributeText"
        | "annulInferredText"
        | "selectedCommitmentId";
      value: string;
    }
  | { type: "setContributeKind"; kind: "objective" | "additional" }
  | { type: "setServerError"; message: string | null }
  | { type: "setSaving"; saving: boolean };

export const INITIAL_CYCLE_CORRECT_FORM: CycleCorrectFormState = {
  cycleId: null,
  needsText: "",
  wantsText: "",
  savingsText: "",
  unallocatedText: "",
  reserveText: "",
  contributeText: "",
  annulInferredText: "",
  contributeKind: "objective",
  selectedCommitmentId: "",
  serverError: null,
  saving: false,
};

export function cycleCorrectFormReducer(
  state: CycleCorrectFormState,
  action: CycleCorrectFormAction,
): CycleCorrectFormState {
  switch (action.type) {
    case "hydrate":
      if (state.cycleId === action.cycleId) return state;
      return {
        ...state,
        cycleId: action.cycleId,
        needsText: action.needsText,
        wantsText: action.wantsText,
        savingsText: action.savingsText,
        unallocatedText: action.unallocatedText,
        reserveText: action.reserveText,
        selectedCommitmentId: action.selectedCommitmentId,
        serverError: null,
      };
    case "setField":
      return { ...state, [action.field]: action.value };
    case "setContributeKind":
      return { ...state, contributeKind: action.kind };
    case "setServerError":
      return { ...state, serverError: action.message };
    case "setSaving":
      return { ...state, saving: action.saving };
    default:
      return state;
  }
}

export function moneyFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

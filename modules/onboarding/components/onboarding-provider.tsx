"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { OnboardingState, OnboardingAction } from "../types";
import { ONBOARDING_DEFAULTS, STORAGE_KEY } from "../constants";

function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  switch (action.type) {
    case "UPDATE":
      return { ...state, ...action.payload };
    case "SET_STEP":
      return { ...state, currentStep: action.payload };
    case "RESET":
      return { ...ONBOARDING_DEFAULTS };
    case "HYDRATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

type OnboardingContextValue = {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(onboardingReducer, ONBOARDING_DEFAULTS);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<OnboardingState>;
        dispatch({ type: "HYDRATE", payload: parsed });
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full
    }
  }, [state]);

  useEffect(() => {
    persist();
  }, [state, persist]);

  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}

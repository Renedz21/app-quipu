"use client";

import { useReducer, useEffect, type ReactNode } from "react";
import { createContext, useContext } from "react";
import type { OnboardingState, OnboardingAction } from "../types";
import { ONBOARDING_DEFAULTS, STORAGE_KEY } from "../constants";

type Ctx = { state: OnboardingState; dispatch: React.Dispatch<OnboardingAction> };
const OnboardingContext = createContext<Ctx | null>(null);

function reducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "UPDATE":
      return { ...state, ...action.payload };
    case "RESET":
      return { ...ONBOARDING_DEFAULTS };
    case "HYDRATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, ONBOARDING_DEFAULTS, (init) => {
    if (typeof window === "undefined") return init;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? { ...init, ...JSON.parse(saved) } : init;
    } catch {
      return init;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full
    }
  }, [state]);

  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): Ctx {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

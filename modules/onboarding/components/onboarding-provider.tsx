/**
 * Provider del state del wizard de onboarding.
 *
 * El state vive en cliente. Se hidrata desde `sessionStorage` al mount
 * (con fallback a `localStorage` en el slice 8). Cada cambio del reducer
 * se persiste a `sessionStorage` para que refrescar la página no pierda
 * el progreso.
 *
 * API expuesta vía Context:
 * - `state: OnboardingState` — el state completo del wizard.
 * - `dispatch(action)` — para mutar el state.
 * - `setStep(step)` — sugar para `dispatch({ type: "SET_STEP", payload: step })`.
 * - `update(payload)` — sugar para `dispatch({ type: "UPDATE", payload })`.
 *
 * Componentes consumidores típicos:
 * - `<Step1Welcome />` lee `state.name`, despacha `update({ name })`.
 * - `<Step2IncomeModel />` lee `state.incomeModel`, despacha `update({ incomeModel })`.
 * - `<Step3Frequency />` lee `state.payFrequency/paydays`, despacha update.
 * - etc.
 *
 * Acciones del reducer:
 * - `UPDATE`: patch parcial del state (mergea campos, reemplaza arrays).
 * - `SET_STEP`: cambia `currentStep`.
 * - `ADD_COMMITMENT`: append a `commitments`.
 * - `REMOVE_COMMITMENT`: elimina por índice.
 * - `RESET`: vuelve al state inicial (para el banner de recuperación).
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { INITIAL_ONBOARDING_STATE } from "../constants";
import type {
  CommitmentDraft,
  IncomeModel,
  OnboardingState,
  OnboardingStep,
  PayFrequency,
  WorkerType,
} from "../types";

const STORAGE_KEY = "quipu:onboarding-state:v1";

/** Acciones del reducer. Discriminadas por `type`. */
export type OnboardingAction =
  | { type: "UPDATE"; payload: Partial<OnboardingState> }
  | { type: "SET_STEP"; payload: OnboardingStep }
  | { type: "ADD_COMMITMENT"; payload: CommitmentDraft }
  | { type: "REMOVE_COMMITMENT"; payload: number }
  | { type: "RESET" }
  | { type: "HYDRATE"; payload: OnboardingState };

/**
 * Reducer puro. Vive en este archivo (no en `lib/`) porque no se
 * reutiliza fuera del provider. Si en el futuro lo necesita otro
 * módulo, se mueve a `modules/onboarding/reducer.ts`.
 */
export function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  switch (action.type) {
    case "UPDATE":
      return { ...state, ...action.payload };
    case "SET_STEP":
      return { ...state, currentStep: action.payload };
    case "ADD_COMMITMENT":
      return {
        ...state,
        commitments: [...state.commitments, action.payload],
      };
    case "REMOVE_COMMITMENT":
      return {
        ...state,
        commitments: state.commitments.filter((_, i) => i !== action.payload),
      };
    case "RESET":
      return INITIAL_ONBOARDING_STATE;
    case "HYDRATE":
      return action.payload;
  }
}

/** API expuesta por el Context. */
interface OnboardingContextValue {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  setStep: (step: OnboardingStep) => void;
  update: (payload: Partial<OnboardingState>) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error(
      "useOnboarding debe usarse dentro de <OnboardingProvider>",
    );
  }
  return ctx;
}

interface OnboardingProviderProps {
  /** Step inicial pasado por el server. Se usa solo en el primer render. */
  initialStep: OnboardingStep;
  children: ReactNode;
}

export function OnboardingProvider({
  initialStep,
  children,
}: OnboardingProviderProps) {
  // Primer render: state inicial + step de la URL.
  // No leemos sessionStorage acá: lo hacemos en useEffect para evitar
  // mismatch de hidratación (server no tiene sessionStorage).
  const [state, dispatch] = useReducer(onboardingReducer, {
    ...INITIAL_ONBOARDING_STATE,
    currentStep: initialStep,
  });

  // Hidratar desde sessionStorage en mount.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OnboardingState>;
        // Re-merge con INITIAL_ONBOARDING_STATE para tolerar keys faltantes
        // (versiones viejas del state).
        const hydrated: OnboardingState = {
          ...INITIAL_ONBOARDING_STATE,
          ...parsed,
          // El currentStep del storage gana sobre el de la URL solo si
          // el usuario ya empezó. Si no, respetamos la URL.
          currentStep:
            parsed.currentStep && parsed.currentStep > 1
              ? parsed.currentStep
              : initialStep,
        };
        dispatch({ type: "HYDRATE", payload: hydrated });
      }
    } catch {
      // sessionStorage no disponible o JSON inválido: ignorar.
    }
  }, [initialStep]);

  // Persistir cada cambio a sessionStorage.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage lleno o no disponible: ignorar.
    }
  }, [state]);

  const setStep = useCallback((step: OnboardingStep) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  const update = useCallback((payload: Partial<OnboardingState>) => {
    dispatch({ type: "UPDATE", payload });
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({ state, dispatch, setStep, update }),
    [state, setStep, update],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// Tipos helpers re-exportados para que los step components no tengan
// que importar de types.ts + provider.ts por separado.
export type {
  CommitmentDraft,
  IncomeModel,
  OnboardingState,
  OnboardingStep,
  PayFrequency,
  WorkerType,
};

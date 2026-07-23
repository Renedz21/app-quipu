/**
 * Hooks reutilizables para analytics y feature flags.
 *
 * Se exportan desde `@/hooks/use-analytics` (este archivo).
 *
 * Convenciones:
 *   - `usePostHogPageview` emite `$pageview` para replay/heatmaps (URLs reales).
 *   - Los eventos de producto (`dashboard_viewed`, etc.) se emiten con `track()`
 *     en los módulos de dominio, no desde el matcher de rutas.
 *   - `useFeatureFlag` se sincroniza con el estado de PostHog via
 *     `posthog.onFeatureFlags` para que el componente se re-renderice cuando
 *     los flags cargan.
 */

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isPosthogConfigured, posthog } from "@/core/analytics";
import {
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_VARIANT_DEFAULTS,
  type FeatureFlagKey,
  FeatureFlags,
} from "@/core/analytics/feature-flags";

/**
 * Rutas actuales (App Router) mapeadas a pantallas de producto para replay.
 * PostHog agrupa por URL; esta tabla es referencia para dashboards y QA.
 */
export const ANALYTICS_SCREEN_ROUTES = {
  authHub: "/auth",
  signIn: "/sign-in",
  signUp: "/sign-up",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  incomeRegister: "/income/register",
  expenses: "(modal FAB / sobre en dashboard)",
  savings: "/savings",
  coach: "(bloque coach en /dashboard)",
  settings: "/settings",
  progress: "/progress",
} as const;

/**
 * Emite `$pageview` en cada cambio de ruta. Complementa `capture_pageview: false`
 * en `initPostHog` para no duplicar eventos de producto con pageviews genéricos.
 */
export function usePostHogPageview(): void {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isPosthogConfigured()) return;
    if (typeof window === "undefined") return;

    posthog.capture("$pageview", {
      $current_url: window.location.href,
      pathname,
    });
  }, [pathname]);
}

/**
 * @deprecated Usar `usePostHogPageview` para pageviews. Los eventos de producto
 * deben emitirse con `track()` en la vista correspondiente.
 */
export function usePageView(_extra?: Record<string, unknown>): void {
  usePostHogPageview();
}

/**
 * Hook de feature flag booleano. Devuelve el valor del flag o el fallback.
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const fallback = FEATURE_FLAG_DEFAULTS[key];
  const [enabled, setEnabled] = useState<boolean>(fallback);

  useEffect(() => {
    const current = posthog.isFeatureEnabled(key);
    if (current !== undefined && current !== null) {
      setEnabled(Boolean(current));
    }

    const unsubscribe = posthog.onFeatureFlags((flags) => {
      const record = flags as unknown as Record<
        string,
        boolean | string | undefined
      >;
      const value = record[key];
      if (value !== undefined) {
        setEnabled(Boolean(value));
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [key]);

  return enabled;
}

/**
 * Hook de feature flag con variant (multivariate). Devuelve el string
 * del variant, o el fallback si no está disponible.
 */
export function useFeatureFlagVariant(key: FeatureFlagKey): string {
  const fallback = FEATURE_FLAG_VARIANT_DEFAULTS[key];
  const [variant, setVariant] = useState<string>(fallback);

  useEffect(() => {
    const current = posthog.getFeatureFlag(key);
    if (typeof current === "string") setVariant(current);

    const unsubscribe = posthog.onFeatureFlags((flags) => {
      const record = flags as unknown as Record<
        string,
        boolean | string | undefined
      >;
      const value = record[key];
      if (typeof value === "string") {
        setVariant(value);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [key]);

  return variant;
}

export const useNewOnboardingV2 = (): boolean =>
  useFeatureFlag(FeatureFlags.NEW_ONBOARDING_V2);

export const useCoachEnabled = (): boolean =>
  useFeatureFlag(FeatureFlags.COACH_ENABLED);

export const useCrisisCoachEnabled = (): boolean =>
  useFeatureFlag(FeatureFlags.CRISIS_COACH);

export const useExtraIncomeEnabled = (): boolean =>
  useFeatureFlag(FeatureFlags.EXTRA_INCOME_ENABLED);

export const useAdaptiveSavingsEnabled = (): boolean =>
  useFeatureFlag(FeatureFlags.ADAPTIVE_SAVINGS_ENABLED);

export const useNewDashboard = (): boolean =>
  useFeatureFlag(FeatureFlags.NEW_DASHBOARD);

export const useExperimentalInsights = (): boolean =>
  useFeatureFlag(FeatureFlags.EXPERIMENTAL_INSIGHTS);

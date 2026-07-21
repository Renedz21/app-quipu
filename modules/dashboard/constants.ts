export const ENVELOPE_LABELS = {
  needs: "Necesidades",
  wants: "Gustos",
  savings: "Ahorro",
} as const;

export const STATUS_BADGE_LABELS = {
  stable: "Estable",
  attention: "Atención",
  risk: "En riesgo",
} as const;

export const COACH_KIND_LABELS = {
  tranquil: "Tranquilo",
  crisis: "Crisis",
  suggestion: "Sugerencia",
} as const;

export const COMMITMENTS_COVERED_HEADER = "Todo está cubierto";
export const COMMITMENTS_UNCOVERED_HEADER = "Faltan por cubrir";

export const HERO_EMPTY_EYEBROW = "Tu espacio";
export const HERO_EMPTY_TITLE = "Tu sistema está listo";
export const HERO_EMPTY_BODY =
  "Registra tu primer ingreso para activar tu ciclo y ver cuánto puedes gastar hoy.";
export const HERO_EMPTY_CTA = "Registrar ingreso";
export const HERO_EMPTY_CTA_HINT = "Próximamente";

export const DASHBOARD_ERROR_TITLE = "No pudimos cargar tu dashboard";
export const DASHBOARD_ERROR_BODY =
  "Revisa tu conexión e intenta de nuevo en unos segundos.";
export const DASHBOARD_ERROR_RETRY = "Reintentar";

export const MOVEMENTS_SECTION_LABEL = "Movimientos recientes";
export const MOVEMENTS_VIEW_ALL = "Ver todo";
export const MOVEMENTS_VIEW_ALL_HINT = "Próximamente";

export const ENVELOPES_SECTION_LABEL = "Tus sobres";
export const COMMITMENTS_SECTION_LABEL = "Próximos compromisos";

export const HERO_AVAILABLE_LABEL = "Disponible hoy";
export const HERO_AVAILABLE_BODY =
  "Puedes gastar esto hoy sin comprometer tu ciclo.";
export const HERO_DAYS_REMAINING = "Días restantes";
export const HERO_CYCLE_HEALTH = "Salud del ciclo";

export const REGISTER_CTA = "Registrar";

export const SIDEBAR_ITEMS: Array<{
  href: string;
  label: string;
  disabled?: boolean;
}> = [
  { href: "/dashboard", label: "Inicio" },
  { href: "#", label: "Registrar", disabled: true },
  { href: "#", label: "Ahorros", disabled: true },
  { href: "#", label: "Compromisos", disabled: true },
  { href: "#", label: "Coach", disabled: true },
  { href: "#", label: "Ajustes", disabled: true },
];

export const BOTTOM_NAV_ITEMS: Array<{
  href: string;
  label: string;
  disabled?: boolean;
}> = [
  { href: "/dashboard", label: "Inicio" },
  { href: "#", label: "Ahorros", disabled: true },
  { href: "#", label: "Compromisos", disabled: true },
  { href: "#", label: "Ajustes", disabled: true },
];

export const PLAN_LABELS = {
  free: "Plan Quipu",
  premium: "Plan Quipu Plus",
} as const;

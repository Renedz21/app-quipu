export const PLAN_LABELS = {
  free: "Plan Quipu",
  premium: "Plan Quipu Plus",
} as const;

/** Precio listado en Polar — mantener alineado con el producto. */
export const PLUS_MONTHLY_PRICE = "US$ 4.99/mes";

/** Chip corto cuando el CTA ya implica mensual. */
export const PLUS_MONTHLY_PRICE_INLINE = "US$ 4.99";

/** Tarjeta free: ancla de precio sin gritar marca. */
export const PLUS_UPGRADE_PRICE_HINT = "Automatización desde US$ 4.99/mes";

/** Ajustes → checkout: acción + precio, no solo nombre del plan. */
export const PLUS_CHECKOUT_CTA = "Automatizar mi dinero";

/** Paywalls: qué obtienes + cuánto cuesta. */
export const PLUS_PAYWALL_CTA = `Ver qué incluye · ${PLUS_MONTHLY_PRICE_INLINE}/mes`;

/** Nudge inline: enlace corto a plan (dashboard, hints). */
export const PLUS_UPSELL_LINK = "Quipu Plus";

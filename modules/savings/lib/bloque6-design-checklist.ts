/**
 * Paridad visual Bloque 6 — referencia interna (`quipu-2.html` #bloque-6, ~L1635–2100).
 * No editar el HTML; usar esta lista al revisar UI.
 */
export const BLOQUE6_DESIGN_CHECKLIST = [
  "Overview: título Ahorros + subtítulo ciclo; badge Total ahorrado (web).",
  "Hero Fondo: único shield qp20→qp21; ícono safe CSS, badge Prioridad/Empieza aquí, barra 12px, copy meses cubiertos.",
  "Metas: label OTRAS METAS + línea; grid 3-col web; debajo del Fondo (antes del ciclo 6N).",
  "Vacío metas: borde dashed, ícono círculo punteado, copy centrado (Fondo primero).",
  "Detalle fondo: página full-bleed qp10→canvas; contenido max-w-3xl; CTAs flex iguales.",
  "6N-A: card neutra (no segundo shield); badge sobre meta; barra objetivo/adicional; copy parked si ya movido.",
  "6N-B: chips origen, monto + slider + chips (+100/+300/todo), destino Fondo o meta, aviso solo ciclo.",
  "6N-C: check celebratorio, desglose objetivo/adicional/total, badge 50/30/20.",
  "6N-D: sin rojo; progreso objetivo; reassurance verde; CTAs Entendido / Mover más.",
] as const;

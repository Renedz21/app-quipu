export const SAVINGS_PAGE_TITLE = "Ahorros";
export const SAVINGS_PAGE_SUBTITLE = "Lo que estás construyendo";
export const SAVINGS_TOTAL_SAVED_LABEL = "Total ahorrado";

export const SAVINGS_CYCLE_CONTRIBUTION_PREFIX = "Estás guardando";
export const SAVINGS_CYCLE_CONTRIBUTION_SUFFIX =
  "cada ciclo. Con calma, se nota.";
export const SAVINGS_MOBILE_SUBTITLE = "Con calma, se nota.";

export const EMERGENCY_FUND_LABEL = "Fondo de emergencia";
export const EMERGENCY_FUND_PRIORITY_BADGE = "Prioridad";
export const EMERGENCY_FUND_TARGET_SUFFIX = "meta de 3 meses de gastos";
export const EMERGENCY_FUND_AUTO_CONTRIBUTION_PREFIX = "Aporte automático";
export const EMERGENCY_FUND_AUTO_CONTRIBUTION_SUFFIX = "/ ciclo";

export const EMERGENCY_FUND_DETAIL_BACK = "Ahorros";
export const EMERGENCY_FUND_DETAIL_BODY =
  "Tu red de seguridad. Cuando esté lleno, tres meses de tranquilidad pase lo que pase.";
export const EMERGENCY_FUND_DETAIL_MOBILE_BODY =
  "Tu red de seguridad. Tres meses de tranquilidad.";

export const EMERGENCY_FUND_STAT_CYCLE = "Aporte por ciclo";
export const EMERGENCY_FUND_STAT_COMPLETE = "Lo completas en";
export const EMERGENCY_FUND_STAT_STREAK = "Racha de aportes";
export const EMERGENCY_FUND_STAT_CYCLES_SUFFIX = "ciclos";

export const EMERGENCY_FUND_CONTRIBUTE_CTA = "Aportar ahora";
export const EMERGENCY_FUND_ADJUST_CTA = "Ajustar aporte";
export const EMERGENCY_FUND_ADJUST_HINT = "Próximamente";

export const GOALS_SECTION_LABEL = "Otras metas";
export const GOALS_NEW_CTA = "+ Nueva meta";
export const GOALS_NEW_MOBILE_CTA = "+ Nueva";

export const NEW_GOAL_TITLE = "Nueva meta";
export const NEW_GOAL_LABEL = "Nombre de la meta";
export const NEW_GOAL_TARGET_LABEL = "Meta (opcional)";
export const NEW_GOAL_SUBMIT = "Crear meta";
export const NEW_GOAL_CANCEL = "Volver";

export const SAVINGS_EMPTY_TITLE = "Tu fondo está listo";
export const SAVINGS_EMPTY_BODY =
  "Registra tu primer ingreso para apartar ahorro en cada ciclo y empezar a construir tu fondo.";
export const SAVINGS_EMPTY_CTA = "Registrar ingreso";

export const SAVINGS_ERROR_TITLE = "No pudimos cargar tus ahorros";
export const SAVINGS_ERROR_BODY =
  "Revisa tu conexión e intenta de nuevo en unos segundos.";
export const SAVINGS_ERROR_RETRY = "Reintentar";

export const CONTRIBUTE_SUCCESS_PREFIX = "Aporte registrado.";
export const CONTRIBUTE_NO_FUNDS =
  "No tienes saldo apartado en Ahorro para aportar en este ciclo.";

export const GOAL_PROGRESS_OF = "de";

export const CYCLE_SAVINGS_SECTION_TITLE = "Tu ahorro este ciclo";
export const CYCLE_SAVINGS_OBJECTIVE_LABEL = "Ahorro objetivo";
export const CYCLE_SAVINGS_OBJECTIVE_HINT = "Tu 20% de siempre";
export const CYCLE_SAVINGS_ADDITIONAL_LABEL = "Ahorro adicional";
export const CYCLE_SAVINGS_ADDITIONAL_HINT = "Lo que decidiste sumar";
export const CYCLE_SAVINGS_TOTAL_LABEL = "Ahorro total";
export const CYCLE_SAVINGS_TOTAL_HINT = "Objetivo + adicional";

export const CYCLE_SAVINGS_LEGEND_OBJECTIVE = "Objetivo — lo planeado";
export const CYCLE_SAVINGS_LEGEND_ADDITIONAL = "Adicional — lo que sumaste";
export const CYCLE_SAVINGS_LEGEND_OBJECTIVE_SHORT = "Objetivo";
export const CYCLE_SAVINGS_LEGEND_ADDITIONAL_SHORT = "Adicional";

export const CYCLE_SAVINGS_SAVED_THIS_CYCLE_SUFFIX =
  "ahorrado este ciclo · tu meta era";
export const CYCLE_SAVINGS_META_WAS_PREFIX = "tu meta era";

export const CYCLE_SAVINGS_ABOVE_BADGE_PREFIX = "Vas";
export const CYCLE_SAVINGS_ABOVE_BADGE_SUFFIX = "por encima de tu meta";
export const CYCLE_SAVINGS_ABOVE_BADGE_MOBILE_PREFIX = "+";
export const CYCLE_SAVINGS_ABOVE_BADGE_MOBILE_SUFFIX = "sobre tu meta";

export const CYCLE_SAVINGS_BELOW_TITLE = "Este ciclo ahorraste un poco menos";
export const CYCLE_SAVINGS_BELOW_BODY_PREFIX = "Guardaste";
export const CYCLE_SAVINGS_BELOW_BODY_MIDDLE = "de tu objetivo de";
export const CYCLE_SAVINGS_BELOW_BODY_SUFFIX =
  "Pasa. Tu sistema sigue en pie y el próximo ciclo retomas tu ritmo.";

export const CYCLE_SAVINGS_BELOW_PROGRESS_LABEL = "Avance de tu objetivo";
export const CYCLE_SAVINGS_BELOW_SAVED_LABEL = "guardado";
export const CYCLE_SAVINGS_BELOW_OBJECTIVE_LABEL = "Objetivo";

export const CYCLE_SAVINGS_BELOW_REASSURANCE_TITLE = "Nada que reparar.";
export const CYCLE_SAVINGS_BELOW_REASSURANCE_BODY =
  "No bajamos tu meta ni te penalizamos. Si quieres, un pequeño empujón: mueve algo del sobrante que te quede.";

export const CYCLE_SAVINGS_MOVE_CTA = "Mover al ahorro";
export const CYCLE_SAVINGS_MOVE_SURPLUS_COPY =
  "Mueve más del sobrante de este ciclo. Tus % no cambian.";

export function cycleSavingsObjectiveHint(allocationSavingsPercent: number): string {
  return `Tu ${allocationSavingsPercent}% de siempre`;
}

export const CYCLE_SAVINGS_SECTION_ID = "cycle-savings";

export const MOVE_SURPLUS_PAGE_TITLE = "Mover sobrante";
export const MOVE_SURPLUS_PAGE_BACK = "Ahorros";
export const MOVE_SURPLUS_SOURCE_LABEL = "¿De dónde sale?";
export const MOVE_SURPLUS_AMOUNT_LABEL = "¿Cuánto quieres mover?";
export const MOVE_SURPLUS_DESTINATION_LABEL = "¿A dónde va?";
export const MOVE_SURPLUS_CYCLE_COPY =
  "Solo por este ciclo. Tu 50/30/20 sigue igual.";
export const MOVE_SURPLUS_RECOMMENDED_BADGE = "Recomendado";
export const MOVE_SURPLUS_REVIEW_TITLE = "Confirma tu traslado";
export const MOVE_SURPLUS_CONFIRM_CTA = "Confirmar traslado";
export const MOVE_SURPLUS_BACK_CTA = "Volver";
export const MOVE_SURPLUS_CONTINUE_CTA = "Continuar";
export const MOVE_SURPLUS_SUCCESS_PREFIX = "Listo.";
export const MOVE_SURPLUS_NO_SURPLUS =
  "No tienes sobrante en Necesidades ni Gustos para mover en este ciclo.";
export const MOVE_SURPLUS_NO_CYCLE_BODY =
  "Registra un ingreso para activar tu ciclo y mover sobrante.";

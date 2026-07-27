# Auditoría Resend — abuso y reputación

Procedimiento periódico para detectar envíos abusivos y mantener la suppression list alineada con la blocklist de la app.

---

## Contexto observado (2026-07)

| Email | Dominio | Patrón |
|-------|---------|--------|
| `kibeke7559@kierko.com` | `kierko.com` (desechable) | Múltiples verificación/reset |
| `mikel55@gmxxail.com` | typo Gmail | Bounce; ya en suppression manual |

Estos dominios están en `convex/lib/email/domainPolicy.ts` — nuevos registros no reciben email, pero Resend puede seguir intentando si el email ya existía.

---

## Auditoría periódica (semanal o tras incidente)

### 1. Listar envíos recientes

Resend dashboard → **Emails**, o MCP `list-emails`:

- Filtrar últimos 7 días.
- Buscar: dominios desechables, mismo destinatario > 3 envíos/hora, bounces.

### 2. Métricas de salud

Dashboard → **Analytics**:

- **Bounce rate** objetivo: < 2%
- **Complaint rate** objetivo: < 0.1%

Configurar alertas en Resend si bounce > 2% o complaint > 0.1%.

### 3. Suppression proactiva

Para dominios/emails abusivos confirmados:

```bash
# Ejemplo vía Resend API / MCP batch-add-suppressions
# Dominios ya bloqueados en app (mantener sincronizado):
# - kierko.com
# - gmxxail.com
# + lista en domainPolicy.ts
```

Regla: si añades dominio a `domainPolicy.ts`, considera suppression batch del dominio en Resend para cortar reintentos a cuentas legacy.

### 4. Blocklist en aplicación

Fuente de verdad: `convex/lib/email/domainPolicy.ts`

- Blocklist estática (desechables conocidos + typos Gmail).
- `assertEmailAllowed()` en auth y `sendOutboundEmail()`.
- Cooldown 3 min entre verificación/reset: tabla `emailSendLog`.

---

## Señales de alerta

- Múltiples `verification` al mismo email en < 5 min (mitigado por rate limiter + cooldown).
- Dominios nuevos con TLD raro + signup masivo mismo día.
- Bounce rate sube tras campaña de bots en sign-up.

---

## Acciones ante spike

1. Confirmar blocklist actualizada en `domainPolicy.ts` y desplegar Convex.
2. Batch suppression en Resend para dominios atacantes.
3. Endurecer WAF auth (ver [`abuse-edge-config.md`](./abuse-edge-config.md)).
4. Revisar PostHog signup trend.

---

## Contacto

Reportes de abuso: **abuse@quipu-finance.app**  
Runbook completo: [`abuse-response-runbook.md`](./abuse-response-runbook.md)

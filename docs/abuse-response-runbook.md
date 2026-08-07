# Runbook — respuesta a abuso (Quipu)

Guía operativa para detectar, contener e investigar abuso técnico (bots, email bombing, DDoS) y cuentas sospechosas. Complementa [`abuse-edge-config.md`](./abuse-edge-config.md) y [`resend-abuse-audit.md`](./resend-abuse-audit.md).

**Principio:** mitigamos abuso de plataforma, no juzgamos contenido financiero automáticamente. Suspensión solo tras revisión manual.

---

## 1. Detectar

| Señal | Dónde mirar |
|-------|-------------|
| Pico de POST `/api/auth/*` | Cloudflare → Security → Events; Vercel → Security → Firewall Events |
| Bounce/complaint spike | Resend dashboard → Analytics |
| Sign-ups anómalos | [PostHog](https://us.posthog.com/project/524696) — evento signup, tendencia horaria |
| Errores auth / rate limit | Sentry (tag `auth_action` si configurado) |
| Cola de revisión | Convex prod → tabla `accountReviewFlags` (`status: open`) |

### Alertas recomendadas (PostHog)

Crear en PostHog → Alerts:

1. **Signup spike:** `USER_SIGNED_UP` (o equivalente) > 3× baseline horario, ventana 1 h.
2. **Verificación baja:** ratio `email verified` / signups < 40% en 24 h (indica cuentas fantasma).

### Alertas recomendadas (Sentry)

1. Errores con mensaje `RATE_LIMITED` o fallos Resend en funciones auth.
2. Tag custom `auth_action: sign_up | sign_in | password_reset` en capturas futuras.

---

## 2. Contener (urgente)

Orden sugerido (< 5 min):

```bash
# Vercel — modo ataque (6 h)
vercel firewall attack-mode enable --duration 6h --yes
```

Cloudflare (dashboard):

- Bloquear IP/ASN específico en WAF custom rule.
- Endurecer rate limits auth si el tráfico sigue alto.

Resend:

- `batch-add-suppressions` para dominios/emails abusivos (ver [`resend-abuse-audit.md`](./resend-abuse-audit.md)).

App (ya en código):

- Turnstile + BotID en `/api/auth/*`
- Rate limiter distribuido Convex (`@convex-dev/rate-limiter`)
- Blocklist dominios en `convex/lib/email/domainPolicy.ts`

---

## 3. Investigar

### Resend

- `list-emails` filtrando por destinatario o dominio sospechoso.
- Revisar suppression list y bounces repetidos.

### PostHog

- Session recordings del usuario (metadata signup/device; montos enmascarados en UI).
- Funnel signup → verificación.

### Convex — perfil sospechoso

Configurar en Convex prod:

- `TURNSTILE_SECRET_KEY` — validación server-side.

Las operaciones de admin son **solo internal** (I5): se ejecutan desde el dashboard
Convex o `npx convex run` con deploy key de owner. **No** hay API pública ni
`adminSecret` en args.

**Caso piloto** — profileId `jn71tmp13b8x5pfpv7z92xhp5h8b7rhn`:

```bash
npx convex run admin/investigation:buildInvestigationBundle --prod \
  '{"profileId":"jn71tmp13b8x5pfpv7z92xhp5h8b7rhn"}'
```

El bundle incluye: resumen del perfil, email auth, stats de ingresos, descripciones recientes, flags de contenido, dominio bloqueado.

**Suspender cuenta** (solo tras revisión):

```bash
npx convex run admin/suspension:setAccountStatus --prod \
  '{"profileId":"<ID>","accountStatus":"suspended"}'
```

**Descartar flag:**

```bash
npx convex run admin/suspension:dismissReviewFlag --prod \
  '{"flagId":"<FLAG_ID>"}'
```

Cron interno (I8): cada 6 h procesa perfiles con `needsContentReview: true`
(candidatos marcados al escribir texto sospechoso) y crea flags en
`accountReviewFlags`. No suspende automáticamente.

---

## 4. Recuperar

1. `vercel firewall attack-mode disable --yes`
2. Revisar falsos positivos en CF/Vercel firewall logs.
3. Ajustar umbrales WAF si usuarios legítimos fueron bloqueados.
4. Documentar incidente (fecha, IPs, volumen, acciones).

---

## 5. Reporte de abuso (usuarios)

- Email: **abuse@quipu-finance.app**
- Enlace en `/terminos` y footer legal.
- Proceso: revisión manual → suspensión o descarte; no bloqueo automático por perfil.

---

## 6. Checklist owner — secretos y prod

Acciones manuales pendientes (ver [`security-debt.md`](./security-debt.md)):

| Item | Dónde | Acción |
|------|-------|--------|
| **D4** `BETTER_AUTH_SECRET` | Convex prod | Rotar; único vs dev (`openssl rand -base64 32`) |
| **R6** Resend | Convex prod | `RESEND_API_KEY`, `RESEND_FROM=Quipu <noreply@quipu-finance.app>` |
| Turnstile | Vercel + Convex | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Admin CLI | Convex prod | `ADMIN_SECRET` |
| Edge WAF | Cloudflare + Vercel | Aplicar reglas en [`abuse-edge-config.md`](./abuse-edge-config.md) o `scripts/vercel-firewall-setup.sh` |

**Nota:** `billing.syncProducts` es `internalAction`; invocar solo desde dashboard Convex o cron interno, no vía API pública.

---

## Referencias

- [`abuse-edge-config.md`](./abuse-edge-config.md) — Cloudflare + Vercel
- [`resend-abuse-audit.md`](./resend-abuse-audit.md) — auditoría email
- [`security-debt.md`](./security-debt.md) — deuda D2/D4/R6

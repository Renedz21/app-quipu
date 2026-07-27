# Configuración edge — mitigación de abuso (Quipu)

Dominio: `quipu-finance.app` (Cloudflare)  
Proyecto Vercel: `app-quipu` (`prj_EYsxYxkfFfdje6FGDcBoN836G5TV`)

Aplicar manualmente en dashboards. Ver también [`abuse-response-runbook.md`](./abuse-response-runbook.md).

---

## Cloudflare

### 1. Bot Fight Mode

Dashboard → **Security** → **Bots** → activar **Bot Fight Mode** (gratis).

Si tienes Pro: evaluar **Super Bot Fight Mode** + **JavaScript Detections**.

### 2. Rate limiting rules

Dashboard → **Security** → **WAF** → **Rate limiting rules** → **Create rule**.

| Nombre | Expresión | Límite | Acción | Duración |
|--------|-----------|--------|--------|----------|
| Quipu Auth POST burst | `(http.request.uri.path contains "/api/auth/") and (http.request.method eq "POST")` | 10 / 60s por IP | Block | 15 min |
| Quipu Sign-up strict | `(http.request.uri.path contains "sign-up") and (http.request.method eq "POST")` | 3 / 600s por IP | Block | 1 h |
| Quipu Password reset | `(http.request.uri.path contains "forget-password" or http.request.uri.path contains "reset-password" or http.request.uri.path contains "request-password-reset") and (http.request.method eq "POST")` | 3 / 900s por IP | Block | 1 h |
| Quipu API flood | `(starts_with(http.request.uri.path, "/api/"))` | 120 / 60s por IP | Managed Challenge | — |

### 3. Custom WAF (bots en auth)

Expresión:

```
(http.request.uri.path contains "/api/auth/") and (cf.bot_management.score lt 30)
```

Acción: **Managed Challenge**

> Requiere Bot Management en plan de pago; omitir si no está disponible.

### 4. HTTP DDoS

Dejar protección managed activa. Ajustar sensibilidad solo si hay falsos positivos (Security → DDoS).

### 5. Turnstile

Crear widget en **Turnstile** dashboard para `quipu-finance.app` + `localhost`.  
Copiar site key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (Vercel)  
Copiar secret → `TURNSTILE_SECRET_KEY` (Vercel + Convex)

---

## Vercel Firewall

Desde el directorio del proyecto (con `vercel` CLI autenticado y proyecto linkeado):

```bash
# Managed rulesets (dashboard: Security → Firewall → Managed Rules)
# - bot_protection → challenge (luego deny tras observar logs)
# - owasp → log

# Rate limit auth API
vercel firewall rules add "Rate limit auth" \
  --condition '{"type":"path","op":"pre","value":"/api/auth/"}' \
  --action rate_limit \
  --rate-limit-window 60 \
  --rate-limit-requests 15 \
  --rate-limit-keys ip \
  --rate-limit-action deny --yes

# Challenge POST sign-up
vercel firewall rules add "Challenge sign-up POST" \
  --condition '{"type":"path","op":"sub","value":"sign-up"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action challenge --yes
```

### Emergencia bajo ataque

```bash
vercel firewall attack-mode enable --duration 6h --yes
# Cuando pase:
vercel firewall attack-mode disable --yes
```

Monitoreo: Vercel → **Security** → **Firewall Events**

---

## Resend

- Dashboard → alertas: bounce rate > 2%, complaint rate > 0.1%
- Auditoría periódica: ver [`abuse-response-runbook.md`](./abuse-response-runbook.md) § Resend
- Dominios bloqueados en app: ver `convex/lib/email/domainPolicy.ts`

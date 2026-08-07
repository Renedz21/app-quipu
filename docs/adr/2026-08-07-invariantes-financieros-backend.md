# ADR — Invariantes financieros del backend (2026-08-07)

## Estado

Aceptado.

## Contexto

La auditoría de `convex/**` encontró contradicciones entre el documento maestro, el código y reglas financieras implícitas (marcar pagado liquidaba sobres; `needsReview` mezclaba legado con dinero sin repartir; Plus bloqueaba operaciones básicas; admin público; cron que barre perfiles enteros).

Sin invariantes explícitas, cada corrección vuelve a reabrir el mismo debate de dominio.

## Decisión

Quedan cerradas ocho invariantes. La fuente operativa es `docs/QUIPU-MASTER.md` §5.5. Este ADR es el relato y el «por qué».

### I1 — Pagado es solo señal

Marcar un compromiso como pagado significa: el usuario confirma que ya pagó en el mundo real.

Quipu no ejecuta el pago. No inventa un gasto. No debita sobres. No puede responder «no puedes marcarlo porque no te alcanza».

Las reservas del compromiso en el ciclo se liberan (dejan de reducir disponible) sin crear movimiento de gasto. Si hace falta reflejar el gasto real, eso es otro registro o una reconciliación explícita.

Tríada: compromiso ≠ reserva ≠ gasto real.

### I2 — Congelar bloquea salidas

Un sobre congelado no admite crear gasto, aumentar gasto ni transferencias salientes. Sí admite consulta, reducir/corregir gasto, recibir dinero y descongelar.

### I3 — Plus vende inteligencia, no candados básicos

Gratis: rescate manual entre sobres, posponer compromiso, posponer aviso de crisis.  
Plus: cubrir desde ahorro del ciclo, plan de crisis completo.

Detectar un problema financiero y exigir suscripción para reorganizar el propio dinero es inaceptable.

### I4 — `needsReview` ≠ dinero sin repartir

`needsReview` = ciclo cuyo estado contable no se puede reconstruir con las invariantes actuales (p. ej. legado sin ledger).  
Dinero sin repartir = `unallocatedCents > 0` (u otro derivado explícito). Nunca la misma bandera para ambos.

### I5 — Administración fuera de la app de usuario

Operaciones admin viven en dashboard Convex, scripts y funciones internas. Sin UI admin dentro del producto.

### I6 — Auth por primitiva común

Las APIs públicas de dominio deben entrar por pocas puertas compartidas (cuenta autenticada + activa + pertenencia). Duplicar comprobaciones a mano garantiza inconsistencias.

### I7 — Exportar y borrar = libro completo

Export y borrado incluyen reservas, líneas de asignación, transferencias internas, feedback y el resto del dominio personal del usuario.

### I8 — Revisión de contenido por candidatos

El trabajo periódico procesa perfiles ya marcados como sospechosos (o un muestreo acotado). No un barrido completo de todos los usuarios en cada pasada.

## Consecuencias

- El código de `convex/` se evalúa contra §5.5, no solo contra «bugs sueltos».
- El arreglo reciente que liquidaba sobres al marcar pagado **viola I1** y debe alinearse (liberar reservas, sin gasto ni débito de sobre).
- Plus: quitar el candado de Plus del rescate manual; dejar Plus en cubrir desde ahorro y plan completo.
- `needsReview` en create/update/delete de ingresos debe dejar de usarse como proxy de unallocated.
- Admin público con secreto compartido debe pasar a superficies internas.
- Introducir `requireActiveAccount` (o equivalente) y migrar mutaciones/queries de dominio.
- Cron de contenido: modelo por bandera/candidatos, no `take(200)` fijo sobre todos los perfiles.

## Alternativas rechazadas

- Pagado = liquidación automática con fallo por fondos insuficientes (comportamiento hostil y mezcla de conceptos).
- Meter operaciones básicas de crisis detrás de Plus.
- Reutilizar `needsReview` para UX de «aún tienes por repartir».
- Backoffice dentro de la app de usuario en esta etapa.

## Referencias

- `docs/QUIPU-MASTER.md` §5.3, §5.5
- Plan de alineación: `docs/superpowers/plans/2026-08-07-alinear-backend-invariantes.md`

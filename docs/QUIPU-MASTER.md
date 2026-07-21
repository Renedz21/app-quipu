# QUIPU — Documento Maestro

> **Única fuente de verdad operativa del proyecto.** Si otro documento, comentario o
> conversación contradice este archivo, **gana este archivo** (o se actualiza
> explícitamente con fecha y motivo en el changelog del final).
>
> **Versión:** 1.0 · **Fecha:** 2026-07-20 · **Producto:** Quipu v2 (código v2.5, diseño v3.0)
>
> Este documento absorbe y reemplaza: `docs/quipu.md`, `docs/arquitectura.md`,
> `docs/quipu-design.md`, `docs/color-map-quipu2.md`, `docs/auth-smoke.md` y
> `docs/superpowers/plans/2026-07-08-v25-pending-work.md` (ver §10).

---

## 1. Cómo usar este documento

**Audiencia:** cualquier persona o agente de IA que toque el proyecto. Leyendo solo
este archivo debes poder entender qué es Quipu, cómo se ve, cómo está construido,
cómo se escribe código aquí y qué falta por construir.

**Mapa de secciones:**

| Sección | Qué responde |
|---|---|
| §2 El producto | ¿Qué es Quipu, para qué existe, para quién, qué no hace? |
| §3 Diseño | ¿Cómo se ve y se siente? Sistema visual completo y estado de los 9 bloques. |
| §4 Arquitectura | ¿Cómo se organiza el código y por qué? |
| §5 Backend y dominio | ¿Qué datos existen y qué reglas los gobiernan? |
| §6 Estándares de código | ¿Cómo se escribe código en este repo? |
| §7 Flujo de trabajo con IA | ¿Qué skills y herramientas se usan y cuándo? |
| §8 Estado y roadmap | ¿Qué existe hoy, qué falta, qué sigue? |
| §9 Operación | ¿Cómo se corre, se prueba y se despliega? |
| §10 Referencias | ¿Qué documentos vivos quedan fuera de este archivo? |

**Documentos vivos que NO están en este maestro** (siguen existiendo por separado):

- `docs/nextjs_knowledge.md` — referencia profunda de Next.js 16 (modelo mental RSC, caché, PPR).
- `docs/manuales-de-sistema.md` — 6 system prompts de rigor (seguridad, interrogador, abogado del diablo, RCA, refactor, CI/CD). Su uso se describe en §7.4.
- `docs/superpowers/` — histórico de planes y specs ejecutados. No se edita, se consulta.
- `quipu-2.html` — canvas visual oficial del diseño (fuente renderizable de §3).

**Regla de actualización:** cuando una decisión cambie, se edita ESTE archivo con la
decisión nueva y una línea en el changelog. No se crean documentos paralelos.

---

## 2. El producto

### 2.1 Qué es Quipu

Quipu es un **sistema de disciplina financiera personal** para el mercado peruano.
Inspirado en los quipus incas: divide el dinero **antes** de gastarlo, no después.

- **Tagline producto:** "Tu sueldo, con disciplina."
- **Tagline landing:** "Sabe si puedes gastar, en segundos."
- **Moneda:** PEN (S/) único. **Idioma:** español peruano único.

La promesa: **dar claridad sobre cuánto dinero puedes usar sin poner en riesgo tu
estabilidad.** Quipu no registra gastos para hacer gráficos; existe para responder:

> **"¿Cuánto puedo gastar hoy sin destruir mi mes?"**

### 2.2 Para quién es

Personas cuyo dinero entra de forma imperfecta. Tres perfiles:

| Perfil | Realidad | `incomeModel` |
|---|---|---|
| **Planilla** (dependiente) | Ingreso predecible, fechas conocidas (ej. 15 y 30) | `fixed` |
| **Independiente** | Ingresos variables, sin fechas fijas (freelance, ventas) | `variable` |
| **Mixto** | Parte estable + parte variable | `mixed` |

### 2.3 El problema real

Las apps financieras tradicionales asumen que el usuario sabe cuánto gana, cobra
siempre el mismo día y tiene disciplina para administrar decenas de categorías. En
Perú eso no es la realidad. El problema no es gastar de más: es la **incertidumbre**
("¿me alcanza?", "¿puedo comprar esto?"). Quipu convierte incertidumbre en reglas simples.

### 2.4 Qué SÍ hace y qué NO hace

**SÍ:** registra dinero que realmente entró, registra gastos, divide automáticamente,
calcula disponibilidad, organiza compromisos, mantiene objetivos de ahorro, detecta
comportamientos peligrosos, recomienda acciones, construye hábitos.

**NO (decisiones, no omisiones):**

- No pide estados financieros, patrimonio, sueldo exacto ni veinte categorías.
- No conecta con bancos (registro manual por diseño), no hace contabilidad, no invierte,
  no calcula impuestos, no gestiona tarjetas.
- Sin chat (el coach es declarativo, nunca conversacional), sin OCR, sin push en v2.5,
  sin OAuth social, sin multi-moneda, sin multi-idioma, sin ML opaco, sin leaderboards,
  sin export a Excel/PDF, sin confeti ni infantilismo.

**La pregunta filtro** — antes de agregar cualquier tabla, pantalla, métrica o feature:

> "¿Esto ayuda al usuario a tomar una mejor decisión con el próximo sol que entre?"

Si no, no pertenece a Quipu.

### 2.5 Filosofía central

1. **Disciplina ≠ austeridad.** Disciplina es saber cuánto tienes, cuánto puedes gastar
   y qué compromisos cubrir; decidir antes del impulso. La app no restringe: elimina ansiedad.
2. **Quipu no trabaja con salarios; trabaja con eventos.** Nunca pregunta "¿cuánto ganas?".
   Pregunta "¿cuánto dinero entró?". No necesita sueldo anual, empresa, AFP ni CTS.
   Cada ingreso es un `incomeEvent` (ver §5.3). No hay ingresos "principales" ni
   "secundarios": solo dinero que llegó.
3. **Tres sobres, nada más:**
   - **Necesidades** — "¿qué necesito para sobrevivir este ciclo?" (alquiler, comida, transporte, servicios).
   - **Gustos** — "¿qué puedo disfrutar sin culpa?" (salidas, compras, caprichos).
   - **Ahorro** — "¿cómo protejo mi yo del futuro?" (fondo de emergencia, metas).
4. **Regla 50/30/20 como herramienta psicológica**, no económica: elimina fatiga de
   decisión y parálisis. Se sacrifica precisión extrema por constancia. Es ajustable por el usuario.
5. **Ciclos, no meses.** Un ciclo es la ventana durante la cual el dinero debe sobrevivir
   (ej. quincena, 30 días desde el pago). No es un mes calendario.
6. **Compromisos fijos viven en el calendario** (`dueDay`: alquiler día 5, Netflix día 18).
   Quipu no pregunta "¿con qué sueldo lo pagarás?" sino "¿ya tienes suficiente para cubrirlo?".
7. **La métrica principal es disponibilidad diaria:** `remainingAmount / daysRemaining`
   → "Te quedan S/ 42 por día". Es una brújula, no un presupuesto rígido.
8. **El coach sugiere, nunca aplica.** Detecta gastos acelerados, riesgos y desbalances;
   propone acciones (congelar sobre, transferencia de rescate). Toda acción requiere
   confirmación explícita del usuario (doble opt-in).
9. **Gamificación para reforzar hábitos, no para entretener.** La racha cuenta ciclos
   consecutivos en orden. Si se rompe: no desaparece, no castiga, no humilla. La
   disciplina no se reinicia; se reconstruye.
10. **Facts over derivations:** se persisten hechos (gastos, ingresos, fechas,
    distribuciones aplicadas) y se calculan derivados (cobertura, disponibilidad,
    alertas). **Si un dato puede derivarse, no se guarda.** Excepciones deliberadas:
    `distributionApplied` (verdad histórica, nunca se recalcula) y `totalIncomeReceived`
    (snapshot materializado mantenido por `createIncomeEvent`).

### 2.6 Filosofía visual

Quipu no debe parecer un ERP, una hoja de Excel, un banco ni una startup genérica.
Debe sentirse cercano, maduro, claro, tranquilo y humano. La emoción objetivo es
**"Entiendo mi dinero"**, no "estoy administrando una empresa".

---

## 3. Diseño

> **Canon visual y de interacción.** Fuente renderizable: `quipu-2.html` (raíz del repo),
> canvas con los 9 bloques en web y móvil + theme switcher funcional.
> **Si algo de UI no está aquí o en el HTML, no existe.**

### 3.0 Resumen ejecutivo

| Dato | Valor |
|---|---|
| Regla madre | **Cada pantalla responde una sola pregunta.** |
| Validación de UX (tríada) | ¿Tranquilo? · ¿En control? · ¿Por buen camino? |
| Color oficial | **Verde musgo `#3C7D6E`** (`--qpA`); alternativo azul `#41648A` |
| Estados del Coach | tranquilo · advertencia · sugerencia · crisis |
| Orden de implementación | Web primero → su equivalente móvil, bloque por bloque |
| Personalización | Desbloqueable por constancia en ciclos, no por compra |
| Plan comercial | Quipu Plus (S/ 14.90/mes). En diseño; código aún no |

**Tres cosas que este sistema nunca es:** un juego (sin confeti/trofeos), un chat
(coach declarativo), un extractor (sin sync bancaria; registro manual).

### 3.1 Principios visuales

1. **Una pregunta por pantalla.** Si obliga a leer más de un encabezado, se parte.
2. **Primero tranquilidad, después optimización.** Ninguna pantalla introduce fricción sin dar calma antes.
3. **El Fondo de Emergencia siempre manda.** En jerarquía, el fondo va arriba; nunca compite con "logros".
4. **Elegante antes que lindo.** Cero emojis, cero decoración gratuita.
5. **Espacio en lugar de borde.** Se separa con espacio en blanco, no con líneas.
6. **El acento hace una sola cosa:** "todo va bien" y CTA principal. Nada más.

### 3.2 Tipografía

Tres familias, cada una con un rol. **No se mezclan.**

| Familia | Rol | Pesos | Casos |
|---|---|---|---|
| **Newsreader** (serif) | Momentos humanos, cifras, titulares | 400/500/600 italic | `<h1>`–`<h3>`, números grandes (S/ 82.50), frases hero |
| **Hanken Grotesk** (sans) | Interfaz, cuerpo, etiquetas | 400–700 | Body, botones (600), inputs, listas |
| **Geist Mono** (mono) | Micro-etiquetas técnicas | 400/500 | Labels uppercase ("DISPONIBLE HOY"), validación, system status |

**Reglas:**
- Una pantalla usa Newsreader para, como mucho, **un titular** y **una cifra grande**. No ambos compitiendo.
- Cifras ≥32px **siempre** Newsreader (los decimales en Newsreader son la firma del sistema).
- Label de 10–11px en mayúsculas con letter-spacing ≥0.1em → Geist Mono. Si dudas, mono.
- Body nunca < 13.5px web / 12.5px móvil.

**Escala web:** Display 64 · Hero 47 · H2 27–33 · H3 21–24 · Body 14.5–15 · Small 12.5–13.5 · Micro 10.5–11 (mono).
**Móvil:** mismos roles, h1/h2 y body × 0.85 aprox.; mono igual.

### 3.3 Color

**Neutros** (fijos, no cambian con el acento):

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#FBFAF7` | Background canvas |
| `--surface` | `#FFFFFF` | Cards, inputs, modales |
| `--surface-soft` | `#FDFCFA` | Inputs default |
| `--surface-warm` | `#F6F4F0` | Top bar, sidebar bg, hero soft |
| `--text-strong` | `#23201C` | Títulos, cifras; también bg de botón primario y FAB |
| `--text` | `#5A554E` | Body principal, labels de form |
| `--text-mute` | `#7C766D` | Subtítulos, captions |
| `--text-faint` | `#A6A099` | Placeholders, micro-copy, nav inactive |
| `--border` | `#E1DCD4` | Bordes sutiles, inputs, botón secundario |
| `--border-strong` | `#E7E3DC` | Cards |
| `--divider` | `#EFEBE4` | Divisores internos |

Otros neutros del HTML: página canvas `#EDEAE4`, dashboard main `#FCFBF9`, info boxes `#FAF8F5`,
stepper/keypad `#F4F2ED`, skeletons `#EEEAE3`/`#E4DFD7`, texto itálico/fechas `#8A847B`,
micro `#B0AAA1`, bordes extra `#ECE8E1`/`#EAE5DE`/`#F0ECE5`/`#F3EFE9`/`#E0DBD3`/`#DAD5CC`/`#D8D3CB`(dashed)/`#CFC9BF`(numeración).

**Acento oficial — verde.** Escala completa del theme switcher (`--qpA` controla los 31 tokens; **nunca se hardcodea ninguno en componentes**):

| Token | Verde (default) | Azul | Uso |
|---|---|---|---|
| `--qpA` | `#3C7D6E` | `#41648A` | Principal, CTA, checks, éxito |
| `--qpB` | `#2C5D52` | `#33506F` | Texto acento, links, ícono active |
| `--qpC` | `#5A6B62` | `#59667A` | Texto muted-accent |
| `--qpSoft` | `#5E8C79` | `#6B87AB` | Gradiente hero fondo (= Ahorro) |
| `--qpD` | `#B8C4B0` | `#B4BFD1` | Pale accent, dot decorativo |
| `--qp01` | `#E9F0EC` | `#E8EDF4` | Surface claro, badges, chips done |
| `--qp02` | `#D5E4DC` | `#D4DEEB` | Borde positivo |
| `--qp03` | `#E4EEE8` | `#E3E9F2` | Avatar bg |
| `--qp04` | `#EEF3F0` | `#ECF0F6` | Sidebar/nav active bg |
| `--qp05` | `#F1F6F2` | `#F0F4F9` | Seleccionado, landing bg, focus ring |
| `--qp06` | `#F2F7F3` | `#F1F5FA` | Hero gradient start |
| `--qp07` / `--qp08` | `#EFF5F1` / `#F9FBF9` | `#EEF2F8` / `#F9FAFC` | Coach gradient |
| `--qp09` | `#EEF5F0` | `#EDF2F8` | Fondo pantallas de éxito |
| `--qp10` | `#F3F8F5` | `#F2F5FA` | Fondo detalle gradient |
| `--qp11` | `#EEF4F0` | `#EDF1F7` | Login panel gradient |
| `--qp12`/`--qp13`/`--qp14` | `#EAF1EC`/`#DCE9E2`/`#D0E0D7` | `#E9EEF5`/`#DAE3F0`/`#CEDAEA` | Passkey icon box |
| `--qp15` | `#CFE0D7` | `#CDDAEA` | Borde dashed acento, botón coach |
| `--qp16` | `#DCE7E0` | `#DAE2EF` | Divider hero |
| `--qp17` | `#E1EAE4` | `#DFE7F1` | Track días restantes |
| `--qp18` | `#DDE8E1` | `#DBE4F0` | Track fondo hero |
| `--qp19` | `#D8E8DF` | `#D6E1F0` | Glow decorativo |
| `--qp20`/`--qp21`/`--qp22` | `#EAF2ED`/`#F7FAF8`/`#CBDDD3` | `#E9EFF6`/`#F6F8FB`/`#C9D6E8` | Fondo emergencia hero |
| `--qp23` | `#DCEAE2` | `#DAE5F1` | Badge "Prioridad" |
| `--qp24` | `#E4EAE5` | `#E2E7F0` | Track detalle fondo |
| `--qp25` | `#DEEAE2` | `#DCE5F1` | Track ahorro (preview ingresos) |
| `--qpS5` / `--qpS7` | `rgba(60,125,110,.5/.7)` | `rgba(65,100,138,.5/.7)` | Sombras de acento |

**Sobres** (fijos, no cambian con el acento):

| Sobre | Hex | Texto | Bg / Borde | Track |
|---|---|---|---|---|
| Necesidades | `#6E7C99` | `#4C5A78` (muted `#8A93A8`) | `#EEF0F5` / `#DCE1EC` | `#E4E8F0` |
| Gustos | `#A6836A` | `#8A6A4E` | `#F2EDE7`·`#F7F2EC` / `#E7D9C8` | `#EEE6DC` |
| Ahorro | `#5E8C79` | `--qpB` | `#E9F1EC` / `--qp02` | `--qp25` |

Extras: badge "Sugerido" bg `#EEE1D2`; luz compromisos `#B7C0D0`; tag "auto" `#A88C6E`.

**Estados cromáticos** (sobrios, nunca agresivos):

| Estado | Color | Background | Border | Text |
|---|---|---|---|---|
| Positivo / éxito | `--qpA` | `--qp01` | `--qp02` | `--qpB` |
| Advertencia (ámbar) | `#C99A3E` | `#F8F1E0` | `#EAD9AE` | `#7A5A1E` |
| Crisis / error (terracota) | `#B0685A` | `#F6EBE7` / `#F8ECE8` | `#E6C9C1` / `#E0BBB0` | `#7C4033` / `#95584B` |
| Info / coach tranquilo | `--qpA` | gradient `--qp06`→`#FBFAF7` | `--qp16` | `--text` |

Input en error: bg `#FDF7F5`, borde 1.5px `#C98E80`, mensaje 12px `#B0685A`.

**Reglas duras:**
- **No hay rojo brillante** (errores = terracota, nunca `#EF4444`).
- **No hay verde WhatsApp** (el verde de Quipu es musgo-sereno `#3C7D6E`).
- **El acento hace una sola cosa.** No decora.

### 3.4 Sombras, radios, espaciado

**Sombras (9 niveles):**

| Token | Valor | Uso |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(35,32,28,.03)` | Cards simples |
| `--shadow-md` | `0 2px 4px rgba(35,32,28,.05)` | Inputs, frames internos |
| `--shadow-lg` | `0 22px 55px -30px rgba(35,32,28,.4)` | Frame canvas web |
| `--shadow-xl` | `0 26px 60px -30px rgba(35,32,28,.42)` | Frame dashboard |
| `--shadow-modal` | `0 40px 90px -25px rgba(0,0,0,.5)` | Modal, FAB elevated |
| `--shadow-sheet` | `0 -20px 50px -20px rgba(0,0,0,.35)` | Bottom sheet móvil |
| `--shadow-glow` | `0 14px 34px -14px var(--qpS7)` | Botón primario, success ring |
| `--shadow-amber` | `0 8px 24px -14px rgba(120,90,30,.3)` | Card advertencia |
| `--shadow-crisis` | `0 16px 40px -18px rgba(176,104,90,.4)` | Card crisis |

Overlays: modal web `rgba(35,32,28,.34)`, móvil `rgba(35,32,28,.32)` + blur.

**Radios:** `r-xs` 6–7 (chips, kbd) · `r-sm` 9 (cards móvil) · `r-md` 11–12 (inputs, botones, cards) ·
`r-lg` 13–14 (cards web) · `r-xl` 16 (hero cards) · `r-2xl` 18 (dashboard hero) ·
`r-modal` 22 · `r-sheet` 24 (`24 24 38 38` top corners) · `r-frame` 38 · `r-shell` 46.
Un componente = un radio; no se anidan radios distintos sin jerarquía.

**Espaciado:** múltiplos de 4 (`4·8·12·16·20·24·32·40·48·56·60`). Móvil 12–22;
web 16–40 en cards y 28–40 en hero. Section gap: 12–14 web / 9–11 móvil.
Bordes 1px; 1.5px solo para seleccionado/error/crisis.

### 3.5 Componentes base

**Botones** (Hanken 600, 14–15px, radio 11; icono opcional a la izquierda, nunca a la derecha):

| Variante | Bg | Texto | Borde | Caso |
|---|---|---|---|---|
| Primary | `--text-strong` | `--bg` | — | CTA principal; 100% ancho en forms/modales |
| Secondary | `--surface` | `--text-strong` | 1px `--border` | "Atrás", acción secundaria |
| Ghost | transparent | `--text-mute` | — | "Ahora no", "Lo veo más tarde" |
| Positive | `--qpA` | `#FBFAF7` | — | Confirmación por defecto (ej. "Confirmar en Gustos") |
| Destructive | transparent | `#B0685A` | — | "Cerrar sesión" |
| Dashed-add | `--surface` | `--qpB` | 1.5px dashed `--qp15` | "+ Nueva meta", "+ Agregar passkey" |
| Disabled | `--surface-soft` | `--text-faint` | 1px `--border` | — |

**Inputs:** altura 46–48 web / 44–46 móvil, radio 11/12, bg `--surface-soft`, borde 1px `--border`;
focus = borde `--text` + ring `0 0 0 3px var(--qp05)`; **label siempre encima** (12.5px 500),
placeholder solo si el campo es obvio. Steppers: − / cifra Newsreader / +. Keypad 3×4
(registrar gasto): botones 48×48, Newsreader 19–21px, cifra central 40–46px sin separador de miles.

**Chips:** pill (radio 999). Default (`--surface`/`--border`/`--text-mute`) · Selected
(`--qp05` + 1.5px `--qpA` + `--qpB` 600) · Envelope por sobre (colores de §3.3) ·
badges "Sugerido" (`#EEE1D2`) y "Activo" (`--qp01`) · Locked (dashed `#D8D3CB`).

**Cards:** Standard (surface, radio 14, padding 17–22) · Hero positive (gradient `--qp06`→`#FBFAF7`,
radio 18) · Coach tranquilo (gradient `--qp07`→`--qp08`) · Fondo emergencia (gradient `--qp20`→`--qp21`,
borde `--qp22`, radio 20) · Advertencia (ámbar + `--shadow-amber`) · Crisis (terracota, borde 1.5px,
`--shadow-crisis`) · Dashed-disabled (logros/metas bloqueadas).
**Regla:** una card de crisis nunca es inline; ocupa fila entera y empuja al resto.

**Modal (web):** 400px max, radio 22, `--shadow-modal`; header título 15px 600 + X;
footer CTA 100%. Stepper de 3 dots 22×4. **Bottom sheet (móvil):** radio `24 24 38 38`,
drag handle 38×4, contenido detrás difuminado. Cierre: X, drag down o tap fuera — siempre las tres.

**Progreso:** bar de sobre (track 4–8px color sobre al 12%, fill 100%) · bar segmentada 50/30/20
(12–16px, 3 segmentos sin gap) · mini bar chart de 12 ciclos (gris `#E7E3DC` incompleto, `--qpA` completado).

**Status dots:** 6–9px — tranquilo `--qpA` · advertencia `#C99A3E` · crisis `#B0685A` ·
neutro `--qpD`. Pulso (`qpulse`) solo en loading, nunca en estado final.

**Achievement badge:** círculo 34–42px. Done (`--qp01`+`--qp02`+ícono `--qpA`) ·
Discoverable (dashed, ícono faint) · Locked (opacity .75).

**FAB (solo dashboard móvil):** 52px, bg `--text-strong`, elevado `translateY(-14px)` desde bottom nav.

**Sidebar (web):** 228px, bg `--surface-warm`, 6 items + avatar al fondo (34px, `--qp03`, inicial serif).
Active: bg `--qp04` + 600. **Bottom nav (móvil):** 76px, bg `rgba(251,250,247,.94)` + blur,
4 items + FAB central; active `--qpB` 600.

**Animaciones:** `qspin` (0.8s linear, spinner) y `qpulse` (1.4s ease-in-out, skeletons con stagger 0.2s).

### 3.6 Estados transversales

Toda pantalla crítica tiene 4 estados (+1 futuro):

1. **Vacío:** ícono suave (<200px, nunca "triste") + titular Newsreader 25–29 + subtítulo mute + 1 CTA.
   Máximo 3 líneas de copy. Si es la primera interacción del usuario, un solo CTA.
2. **Loading:** spinner 38–46px (borde 3px `--border` + top `--qpA`, `qspin`) + titular Newsreader 25 +
   3–4 skeleton bars. Copy: "Preparando tu espacio…" — **nunca "Cargando"**. >4s sin resolver = bug.
3. **Error:** card terracota 380–400px (`#F6EBE7`/`#E6C9C1`, radio 12), ícono `!` en círculo `#B0685A`,
   título 13.5px `#7C4033` + descripción `#95584B`. Siempre ofrece salida ("Intentar de nuevo" primary).
4. **Éxito:** check en círculo 70–88px bg `--qpA` + `--shadow-glow` + titular Newsreader 26–32.
   Con nombre propio solo cuando es transaccional ("Tu cuenta está lista"), nunca en rutina ("Gasto registrado").
   Siempre con CTA de salida.
5. **Confirmación destructiva (futuro, no implementado):** modal con border-top 4px `#B0685A`,
   secondary "No, cancelar" + destructive filled.

### 3.7 Los 9 bloques (con estado de implementación)

Cada bloque responde **una pregunta**. Estado al 2026-07-20 (detalle del delta en §8.2).

| # | Bloque | Pregunta | Estado |
|---|---|---|---|
| 1 | Autenticación | ¿Eres tú? | ✅ Implementado (canon redesign) |
| 2 | Onboarding | ¿Cómo se arma tu sistema? | ✅ Implementado (v3, 3 pasos) |
| 3 | Dashboard | ¿Voy bien? | ✅ Implementado (2026-07-21, P1-4) |
| 4 | Registrar gasto | ¿De qué sobre sale? | ✅ Implementado (2026-07-21, variantes A/B) |
| 5 | Ingresos | ¿Cuánto entró y a dónde va? | ✅ Implementado (2026-07-21) |
| 6 | Ahorros | ¿Qué estoy construyendo? | ✅ Implementado (2026-07-21, P1-9) |
| 7 | Coach | ¿Qué decisión debería tomar? | ✅ Implementado (2026-07-21, P1-10) |
| 8 | Gamificación | ¿Qué he logrado? | ⬜ No existe |
| 9 | Perfil y ajustes | ¿Cómo funciona mi sistema? | ⬜ Parcial (sin plan/preferencias) |

**Bloque 1 — Autenticación "¿Eres tú?"**
Pantallas web: Landing · Login · Registro · Passkeys · Vacío · Error · Recuperación · Loading · Éxito
(móvil: falta Recuperación/Loading/Vacío en el HTML).
Decisiones: passkey primero, contraseña como respaldo; login web con panel lateral 400px
(gradient `--qp11`→`--qp03`) con tríada, sin cifras ficticias; "Ahora no, usar contraseña"
explícito en vez de "cancelar"; recuperación en tono humano. Sin magic link, OAuth ni SMS.

**Bloque 2 — Onboarding "¿Cómo se arma tu sistema?"**
3 pasos + resumen, mismo orden web/móvil. Paso 1 Perfil (3 cards: dependiente/independiente/mixto).
Paso 2 Sistema, **condicional al perfil** (única divergencia por dato en toda la app):
dependiente = mensual/quincenal + día de pago con live preview del ciclo; independiente = 15/30 días
+ info card; mixto = parte previsible (monto + día) + fuentes variables (chips). Paso 3 Reparto
50/30/20 con bar segmentada + steppers + validación inline ("Suma 100% · listo"). Siempre se
puede volver atrás. El paso 3 dice "Ahorro · Fondo de emergencia y metas", no "ahorro 20%".
Sin educación financiera, glosario, video ni tour: solo configuración.
(En el HTML móvil faltan Paso 2 Independiente y Mixto.)

**Bloque 3 — Dashboard "¿Voy bien?"**
5 niveles, misma jerarquía web y móvil, distinta densidad:
1. **Disponible hoy (hero):** cifra Newsreader 64 web / 34 móvil + "Puedes gastar esto hoy sin
   comprometer tu ciclo" + validación inline + días restantes con progress + badge de estado.
   **El hero nunca cambia de posición ni de propósito.**
2. **Tus sobres:** 3 cards (orden fijo Necesidades·Gustos·Ahorro) con disponible/total + progress.
3. **Próximos compromisos:** lista con "en N días" + monto + status de cobertura en header.
4. **Coach:** solo si tiene algo que decir (ver Bloque 7).
5. **Movimientos recientes:** 4 items + "Ver todo", ingresos en verde, gastos en dark.
Decisiones: "registrar" desde header (web) o FAB (móvil); **sin búsqueda, filtros ni tabs**
(el dashboard es una vista, no una herramienta); saldo negativo se muestra como "0.00" y el
coach sube a advertencia. Móvil: niveles 1–2 sin scroll en iPhone 14.

**Bloque 4 — Registrar gasto "¿De qué sobre sale?"**
Target **<10 segundos** end-to-end. 3 variantes, mismo backend:
A. FAB → keypad → sobre sugerido (highlighted, sobrescribible con un toque) → confirmación
   ("Te quedan S/ 322 en Gustos" + "Registrado en 8 segundos").
B. Desde tarjeta de sobre → modal directo con sobre preseleccionado, monto + concepto opcional.
C. Automático (gasto detectado) → card "auto" + "¿Está bien así?" + Sí/Cambiar sobre.
Decisiones: **concepto siempre opcional**; sin selector de fecha (asume hoy); sin adjuntos;
móvil = bottom sheets. Sin OCR, QR, bancos ni geolocalización.
(En el HTML móvil falta la Variante B.)

**Bloque 5 — Ingresos "¿Cuánto entró y a dónde va?"**
Solo manual. Web 2-col: inputs (monto Newsreader 34 + origen en chips + fecha default hoy) y
**preview de impacto siempre visible antes de confirmar** (3 sobres + nuevo disponible hoy).
Confirmación con deltas por sobre. Decisiones: origen es chip, no texto libre; **todo ingreso
se reparte automáticamente** según porcentajes (no hay "no repartir"); sin edición retroactiva
en este flujo. Móvil: full-screen, no sheet.

**Bloque 6 — Ahorros "¿Qué estoy construyendo?"**
**El Fondo de Emergencia siempre hero** (fila entera, gradient `--qp20`→`--qp21`, badge "Prioridad",
cifra Newsreader 52, progress con 3 marks de meses, "1.2 de 3 meses cubiertos · vas seguro",
aporte automático por ciclo). Detalle del fondo: 3 sub-cards (aporte / completa en ~N meses /
racha) + "Aportar ahora" + "Ajustar aporte". Otras metas: grid 3-col, máx 6 visibles,
"+ Nueva meta", sin fecha objetivo obligatoria. El progreso se actualiza con aporte explícito,
no al registrar gasto. **El aporte al fondo es automático desde el sobre Ahorro.**
Sin metas compartidas, inversiones, cripto ni plazos.

**Bloque 7 — Coach "¿Qué decisión debería tomar?"**
Asistente **declarativo**; ocupa espacio proporcional a la gravedad:

| Estado | Tamaño | Color | Patrón | Acción |
|---|---|---|---|---|
| Tranquilo | Card pequeña en dashboard | gradient verde | "Vas por buen camino. Cierras el ciclo con S/ X de sobra." | "Ver detalle" / "Guardar de más" |
| Advertencia | Banner ámbar, fila propia | ámbar | "Tu ritmo de gastos es más alto de lo habitual. Todavía puedes ajustar." | "Ajustar ciclo" / "Ver en qué" |
| Sugerencia | Card, fila propia | gradient verde | "[Acción concreta]. ¿Lo hacemos?" | "Hacerlo" / "Ahora no" |
| Crisis | Hero, toma la pantalla | terracota | "Te faltan S/ X para cubrir tus compromisos. Resolvámoslo ahora en un paso." | 2 opciones explícitas + "Lo veo más tarde" |

Reglas duras: nunca más de 1 pregunta; sin historial conversacional; no proactivo fuera del
dashboard; copy de crisis directo, no dramático; en tranquilo es visible por defecto (refuerza orden);
no personaliza más allá del nombre. Sin chat, voz, historial ni ML visible.
(En el HTML móvil falta el estado Sugerencia.)

**Bloque 8 — Gamificación "¿Qué he logrado?"**
"Tu progreso": racha (cifra Newsreader 50 + "ciclos cerrados en orden" + bar chart de 12 ciclos) +
logros (grid, estados done/discoverable/locked; se ganan por hechos objetivos del sistema, no por
check-ins). "Recompensas": desbloqueables por racha — **Tema Tinta** (3 ciclos), **Acento Arcilla**
(6), **Informe anual encuadernado** (12) — + personalización activa (acento, tema, ícono).
**La unidad de progreso es el ciclo**, no el día ni el punto. Sin puntos, monedas, leaderboard,
XP, niveles ni badges de monto.

**Bloque 9 — Perfil y ajustes "¿Cómo funciona mi sistema?"**
Cuenta y sistema juntos (misma pantalla, dos columnas web / secciones móvil):
Cuenta = perfil (avatar, nombre, tags) + **plan y suscripción siempre visibles** (Quipu Plus
S/ 14.90/mes, estado, renovación) + seguridad (passkeys por dispositivo, "+ Agregar passkey",
sesiones activas, "Cerrar todas"). Sistema = porcentajes (preview + "Ajustar reparto") + ciclo
(tipo/inicio/perfil + "Cambiar ciclo") + compromisos fijos (lista + total por ciclo + "+ Agregar")
+ preferencias (moneda PEN read-only, idioma ES read-only, toggles de resumen diario y alertas).
"Cerrar sesión" es un item de lista (acción deliberada). **No hay "Eliminar cuenta" en v2.5.**

### 3.8 Microcopy

**Tono:** humano, no transaccional ("Tu sistema está listo, Carlos", no "Configuración completada");
tranquilizador antes que informativo (primera línea calma, segunda explica); cero jerga financiera
("sobre", no "categoría presupuestaria"); tuteo; español peruano; cero superlativos.

**Patrones:**

| Situación | Patrón | Ejemplo |
|---|---|---|
| Éxito | `[Acción] + [dato relevante]` | "Gasto registrado. Te quedan S/ 322 en Gustos este ciclo." |
| Validación | `Vas [verbo]. [Proyección]` | "Vas por buen camino. Cierras el ciclo con S/ 240 de sobra." |
| Error | `[Qué pasó]. [Qué hacer]` | "No pudimos iniciar sesión. Revisa tu correo e intenta de nuevo." |
| Loading | `[Verbo presente, amable]` | "Preparando tu espacio…" |
| Sugerencia coach | `[Acción]. [Por qué]` | "Mueve S/ 120 de Gustos a Necesidades y llegas tranquilo." |
| Crisis | `[Hecho]. [Resolvámoslo en X]` | "Te faltan S/ 180. Resolvámoslo ahora en un paso." |
| Decisión blanda | infinitivo / "Hacerlo" | "Hacerlo" · "Ahora no" · "Lo veo más tarde" |
| Tiempo | `En N segundos` | "Registrado en 8 segundos" |

**Palabras prohibidas:** cancelar (→ "ahora no", "volver"), sí (→ "hacerlo"), error (→ "no pudimos"),
click aquí (→ "toca", "abre"), login (→ "iniciar sesión"), submit (→ "continuar", "registrar"),
usuario (→ "tú"), presupuesto (→ "sistema", "sobre"), categoría (→ "sobre"), transacción
(→ "gasto", "ingreso", "movimiento"), "¡Importante!", superlativos de marketing.

**Tríada de validación:** toda pantalla positiva responde ¿Tranquilo? ("Todo sigue en orden") +
¿En control? ("Puedes gastar S/ 82.50 hoy") + ¿Por buen camino? ("Cierras con S/ 240 de sobra").
Si falta una, la pantalla está incompleta.

### 3.9 Lo que falta diseñar (gaps del propio HTML)

- Móvil: Recuperación/Loading/Vacío (B1), Paso 2 Independiente y Mixto (B2), Variante B de gasto (B4), coach Sugerencia (B7).
- Web: dashboard en estados no-positivos (vacío/crisis solo se ilustran en B7).
- Pantallas ausentes: detalle de compromiso, "Ver todo" de movimientos, destino del nav "Compromisos".
- Modal de confirmación destructiva (diseñado en spec, no implementado).
- Theme switcher a CSS variables y componentes codificados como sistema (no existe Storybook).

---

## 4. Arquitectura técnica

> Documento constitucional técnico. Si una decisión contradice esta sección, gana esta
> sección (o se actualiza explícitamente).

### 4.1 Origen

Quipu v2 nace del aprendizaje de v1, que aplicó `cacheComponents`/PPR sin entender el modelo
mental y terminó rígido y sin UI usable. v2 invierte el orden: **primero arquitectura conceptual,
después implementación**. La UI se construye módulo por módulo sobre cimientos explícitos.

### 4.2 Principios rectores

1. **Toda la lógica vive en Convex.** El cliente es presentación + orquestación. Si una regla
   de negocio puede ir en una `mutation`/`query`, va ahí.
2. **Server-first.** Server Component por defecto; `'use client'` solo con estado, eventos,
   APIs de browser o `useQuery` de Convex. Boundary lo más abajo posible.
3. **Feature First, máximo 2 niveles** bajo `modules/[x]/`.
4. **Tipos generados, no inventados.** `Doc`/`Id` de `convex/_generated/dataModel`; view models
   derivados con `Pick`/`Omit`. Prohibido duplicar a mano.
5. **Errores tipados, no strings.** Backend lanza `ConvexError({ code, message })`; el cliente
   discrimina por `error.code`. Nunca comparar `error.message` con strings.
6. **Mobile-first, accesible por defecto.** Diseño para 375px primero; a11y es restricción desde el sketch.

### 4.3 Stack confirmado

| Capa | Tecnología | Razón |
|---|---|---|
| Framework | Next.js 16.2 (App Router) | RSC, streaming, layouts anidados |
| UI runtime | React 19.2 | `use()`, View Transitions |
| Bundler | Turbopack | Default en v16, sin config |
| Optimización | React Compiler (`reactCompiler: true`) | Cubre memo/useMemo/useCallback manual |
| Backend/DB | Convex 1.42 | Queries reactivas, mutations transaccionales |
| Auth | Better Auth + passkey | Sin passwords para el usuario |
| Forms | TanStack Form + Zod | Type-safe, SSR-friendly |
| UI primitives | shadcn/ui sobre Base UI | Accesibles |
| Styling | Tailwind v4 | Sin config legacy |
| Lint/format | Biome 2.5 | No se discute estilo con él |
| Tests | Vitest 4 + Testing Library | TDD donde aplique |

### 4.4 Estructura de carpetas

```
app-quipu/
├── app/          → Routing Next.js (sin lógica de negocio; composición pura)
├── auth/         → Better Auth: client, server, helpers de sesión
├── convex/       → Backend: schema, queries, mutations, lógica de negocio
├── core/         → Infra transversal: env.ts, errors/, constants.ts
├── shared/       → UI primitives (shadcn), helpers (money, date), layout reusable
├── modules/      → Un directorio por dominio funcional
├── hooks/        → Hooks globales (solo si los usan 2+ módulos)
└── docs/         → Este documento + referencias
```

| Capa | Puede importar desde | Nunca contiene |
|---|---|---|
| `app/` | `modules/`, `shared/`, `auth/`, `core/` | Lógica de negocio, acceso a datos |
| `auth/` | `core/` | Lógica de dominio |
| `convex/` | `core/`, `convex/lib/` | UI, lógica de cliente |
| `core/` | (nada del sistema) | UI, dominio |
| `shared/` | `core/` | Lógica de un dominio específico |
| `modules/[x]/` | `convex/_generated/` (tipos), `shared/`, `core/`, `auth/` | Acceso directo a Convex desde UI |
| `hooks/` | `shared/`, `core/` | Lógica de dominio |

**Nunca:** `core/` no importa de `modules/` ni `shared/`; `shared/` no importa de `modules/`;
`modules/[x]/` no importa de `modules/[y]/` (lógica compartida sube a `shared/` o `core/`).

**Estructura interna de módulo (todos igual):**

```
modules/[x]/
├── components/    Componentes React del dominio
├── actions.ts     Wrappers tipados sobre mutations Convex ("use server")
├── queries.ts     Wrappers tipados sobre queries Convex
├── schemas.ts     Zod schemas de inputs y payloads
├── types.ts       View models / DTOs del cliente
├── constants.ts   Constantes del módulo
├── lib/           Funciones puras del dominio (opcional, con tests)
└── hooks/         Hooks de orquestación del módulo (opcional)
```

**Regla de oro del 2-niveles:**
✅ `modules/onboarding/components/step-3-allocation.tsx`
❌ `modules/onboarding/components/forms/step-3.tsx`
❌ `modules/onboarding/components/wizard/amount-field.tsx`
Si aparece un tercer nivel: reusable → `shared/`; complejo → partir el padre; otro dominio → su módulo.

**No hay `repositories/` ni `services/`** (patrón del demo con Drizzle): Convex absorbe ambas
capas. El módulo del cliente es delgado: presentación + orquestación + validación Zod.

### 4.5 Reglas de comunicación con Convex

**Toda mutation/query se invoca desde un wrapper del módulo** (centraliza tipado, args y errores;
la UI nunca importa `convex/*` directamente):

```ts
// modules/onboarding/actions.ts
"use server";
import { fetchAuthMutation } from "@/auth/auth-server";
import { api } from "@/convex/_generated/api";
import { fromConvexError } from "@/core/errors";
import { completeOnboardingSchema } from "./schemas";

export async function completeOnboardingAction(input: unknown) {
  const parsed = completeOnboardingSchema.parse(input);
  try {
    return await fetchAuthMutation(api.profiles.createProfile, parsed);
  } catch (error) {
    throw fromConvexError(error);
  }
}
```

**Errores semánticos:** el backend lanza `ConvexError({ code, message })` con códigos del enum
`ErrorCode` en `core/errors/index.ts`; el cliente usa `fromConvexError()` y discrimina por
`error.code`. `fetchAuthMutation` **tira excepción**, no retorna `result.ok` — siempre try/catch.

**Type-safety end-to-end:** `Id<"profiles">`, `Doc<"profiles">` vienen de
`convex/_generated/dataModel`. View models se derivan (`Doc<"envelopes"> & { percentRemaining: number }`).

### 4.6 Reglas de Next.js 16 aplicadas

| Decisión | Estado | Razón |
|---|---|---|
| `cacheComponents: true` | **NO activado** | v1 lo quemó; datos 100% por usuario, nada cacheable entre usuarios aún. Se activa con 3+ fetches compartidos. Candidatos se marcan `// TODO(cacheComponents):` |
| `reactCompiler: true` | Activado | Confiar en él; no `memo`/`useMemo`/`useCallback` manual salvo profiler |
| `loading.tsx` global | **No usar** | Bloquea LCP. `<Suspense>` con skeleton por sección |
| Server Actions | Solo cuando Convex no resuelva | Default: mutation Convex desde cliente. Server Action solo si se necesita redirect nativo, cookie write o progressive enhancement |
| Multi-moneda | No | PEN hardcoded en `core/constants.ts` |
| Tipos duplicados | Prohibido | Derivar de `dataModel` |

**Árbol de decisión por componente:** ¿estado/efectos/eventos/APIs browser? → `'use client'`.
¿Form con TanStack Form? → `'use client'`. ¿`useQuery` de Convex? → `'use client'`.
Si no → Server Component. Los Client Components pueden recibir Server Components como
`children`/`props` sin meterlos al bundle.

**Streaming:** skeletons por sección dentro de `<Suspense>`; el LCP (hero "Disponible hoy")
pinta sin esperar secciones secundarias. Convención: cada sección expone su `*Skeleton` hermano.

**Imágenes/fuentes:** `next/image` con `preload` en la imagen LCP (`priority` deprecado en v16),
`sizes` explícito siempre; `next/font/google` con `display: swap` (Newsreader, Hanken Grotesk, Geist Mono).

### 4.7 Reglas de UX técnica

- **Mobile-first:** 375px primero; touch targets ≥44×44px; drawer/sheet sobre modal en móvil;
  `inputMode="decimal"` en inputs de dinero.
- **Skeletons honestos:** reflejan la geometría real; sin spinners full-screen salvo acciones puntuales; usar `<Skeleton>` de shadcn.
- **Errores en forms:** Zod con mensajes en español, claros y accionables; errores de servidor junto al campo o en banner según severidad.
- **Accesibilidad:** `aria-label` en íconos sin texto; `aria-describedby` input↔error; focus visible siempre; contraste AA mínimo; navegación por teclado completa.

### 4.8 Anti-patrones explícitos (lo que v1 hizo mal)

1. Activar `cacheComponents` antes de tener UI.
2. Strings como errores (`throw new Error("No autorizado")`).
3. `process.env.X` sin validar (usar `core/env.ts` con Zod).
4. Lógica de negocio en componentes React.
5. Carpetas `_components/` profundas en `app/`.
6. Tipos duplicados a mano en vez de generados.
7. Spinner global mientras carga todo.
8. Server Actions donde Convex resolvía (doble boilerplate).

### 4.9 Cómo incorporar un feature nuevo

1. ¿Dominio nuevo? → `modules/[nombre]/` con la estructura estándar.
2. ¿Dominio existente? → agregar a `modules/[existente]/`.
3. ¿Nueva tabla o lógica? → `convex/` + actualizar `schema.ts` (y regenerar `_generated` con `npx convex dev`).
4. ¿Nueva env var? → `core/env.ts` con validación Zod.
5. ¿Input especializado (monto, fecha, %)? → ¿existe en `shared/`? Si no, crearlo ahí.
6. ¿Nuevo error tipado? → `core/errors/index.ts` (enum `ErrorCode`).
7. ¿Nuevo layout? → revisar `shared/components/layout/` antes de crear.

---

## 5. Backend y dominio (Convex)

### 5.1 Schema real (`convex/schema.ts`, 10 tablas propias)

Las tablas de Better Auth (`user`, `session`, `account`, `passkey`, `verification`) viven en el
componente `convex/betterAuth/` y no se re-exportan.

| Tabla | Campos clave | Notas de dominio |
|---|---|---|
| `profiles` | userId, name, country, currencyCode/Symbol, `incomeModel` (fixed/variable/mixed), `cycleDurationDays?` (15/30), `mixedFixedAmount?` (céntimos), `variableIncomeSources?`, `payFrequency?` (monthly/biweekly/weekly/variable), `paydays?`, allocationNeeds/Wants/Savings (default 50/30/20), onboardingComplete, plan (free/premium), polarCustomerId/SubscriptionId? | `incomeModel` required desde P0-3 (2026-07-21) |
| `financialCycles` | profileId, startDate, endDate, status (active/closed), `totalIncomeReceived?` | Snapshot materializado mantenido por `createIncomeEvent` |
| `envelopes` | profileId, cycleId, type (needs/wants/savings), allocatedAmount, remainingAmount, frozenUntil? | Saldo vivo O(1) para el dashboard |
| `subEnvelopes` | profileId, parentEnvelopeType (**solo "savings"**), label, emoji, currentAmount, targetAmount?, isSystemDefault | Metas de ahorro; `isSystemDefault` = Fondo de Emergencia |
| `fixedCommitments` | profileId, name, amount, envelope (needs/wants), `dueDay?` (1–31, Lima), `coveredAt?`, `coveredBy?` | El compromiso vive en el calendario; cobertura cascada desde incomeEvents del ciclo |
| `expenses` | profileId, cycleId, envelopeId, subEnvelopeId?, amount, description, timestamp | Hechos inmutables |
| `coachInteractions` | profileId, cycleId, triggerEvent, initialNudge, options[], selectedOptionId?, status (pending/resolved), createdAt | El coach sugiere; el usuario decide |
| `streaks` | profileId, currentStreak, longestStreak, lastEvaluatedCycleId? | Unidad de progreso = ciclo |
| `cycleHistory` | profileId, cycleId, status (compliant/warning/failed), evaluatedAt | "warning" = zona de amortiguación |
| `incomeEvents` | profileId, cycleId, amount (céntimos >0), source (payroll/freelance/business/gift/refund/investment/other), description (siempre requerido), occurredAt, `distributionApplied{needs,wants,savings}` | Log unificado de ingresos; `distributionApplied` nunca se recalcula |

### 5.2 Funciones por archivo

| Archivo | Funciones |
|---|---|
| `convex/profiles.ts` | `getMyProfile` (query), `createProfile`, `updateProfileSettings` (mutations) |
| `convex/incomeEvents.ts` | `createIncomeEvent`, `deleteIncomeEvent` (mutations) |
| `convex/expenses.ts` | `registerExpense`, `deleteExpense` (mutations), `getRecentExpenses` (query) |
| `convex/fixedCommitments.ts` | `listMyCommitments`, `getCommitmentCoverage` (queries), `createFixedCommitment`, `deleteFixedCommitment`, `createCommitmentsBulk` (mutations) |
| `convex/coachEngine.ts` | `getActiveNudge` (query), `resolveNudgeAction`, `applyRescueTransfer`, `dismissRescueSuggestion`, `applyCoverFromCycleSavings`, `postponeCommitmentForCycle`, `snoozeCrisisCoach` (mutations) — sugiere, confirma, aplica |
| `convex/lib/rescueTransfer.ts` | Puras: `validateRescueTransferApply`, `computeRescueEnvelopePatches` (con tests) |
| `convex/lib/crisisResolution.ts` | Puras: opciones crisis, split savings→sobres, copy canon (con tests) |
| `convex/auth.ts` | `authComponent`, `createAuthOptions`, `createAuth`, triggers onCreate/onUpdate/onDelete |
| `convex/http.ts` | Router HTTP (endpoints auth) |
| `convex/lib/budgetMath.ts` | Puras + constantes: `computeAllocations`, `isValidAllocations`, `isValidPaydays`, `computeRescueTransfer`, `suggestRescueTransfer`, `shouldWarnWantsBurn`, `evaluateCycleCompliance` (con tests) |
| `convex/lib/commitmentCoverage.ts` | Puras: `computeCommitmentCoverage`, `computeAllCommitmentCoverage`, `mapCoverageStatusToDashboard` (con tests) |
| `convex/lib/evaluateCommitmentCoverage.ts` | Persiste `coveredAt` / `coveredBy` tras evaluación en mutaciones de ingreso |
| `convex/savings.ts` | `getOverview`, `getEmergencyFundDetail` (queries), `contributeToSubEnvelope`, `contributeToGoal`, `createSavingsGoal` (mutations) |
| `convex/lib/savingsMath.ts` | Puras: meta fondo 3 meses, meses cubiertos, progreso, ciclos para completar (con tests) |

### 5.3 Reglas de dominio v2.5

- **`incomeModel` reemplazó a `workerType`** (v2.0 → v2.5, migración widen→migrate→narrow ejecutada 2026-07-08). `workerType` y `frequency` ya no existen en el schema ni en el código.
- **`incomeEvents` unificó** `adHocIncomes` + sueldo. Migración 1:1 con `source: "other"` (trade-off aceptado).
- **`fixedCommitments.dueDay`** reemplazó `frequency` (first/second/every_payday). Migración de `every_payday` con pérdida aceptada (→ primer payday).
- **Cobertura de compromisos:** motor de cascada P1-1 (`computeCommitmentCoverage` en `convex/lib/commitmentCoverage.ts`); persiste `coveredAt` / `coveredBy` al financiarse desde `incomeEvents` del ciclo.
- **`HORIZON_DAYS = 15`** hardcoded para `variable` (configurable diferido: P2-2).
- **Disponibilidad del ciclo es referencia, no regla** (`saldoRestante / díasRestantes`).
- **Plan Free ilimitado y manual** (`FREE_PLAN_MONTHLY_LIMIT` eliminado); Premium se justifica por automatización, no por más registros.
- **Dinero en céntimos enteros, siempre** (`shared/lib/money.ts`). **Fechas en `America/Lima`** (`shared/lib/date.ts`).

### 5.4 Auth (Better Auth + passkey)

- **Rutas activas:** `/sign-in` (split-panel, 2-step inline email→password, passkey en ambos pasos)
  y `/sign-up` (3 pasos inline: nombre+email → passkey → éxito). `/auth` redirige a `/sign-in`.
  Las rutas `/sign-in/email` y `/sign-up/email` fueron eliminadas (flujos inline).
- **Auth es módulo de dominio** (`modules/auth/`); `app/(auth)/` es solo wiring de rutas.
- **Validación de sesión en `page.tsx`, nunca en `layout.tsx`:** `requireUnauthenticatedSession()`
  (rutas auth) / `requireAuthenticatedSession()` (rutas protegidas) desde `auth/auth-server.ts`.
- **Errores de Better Auth → `ErrorCode`**; nunca comparar strings de mensaje en la UI.
- **Detección de passkey (lección P0-7):** el gate es `typeof window.PublicKeyCredential`;
  UVPA (`isUserVerifyingPlatformAuthenticatorAvailable`) es solo informativo. Gatear en UVPA
  mintió a usuarios con security keys/PIN. Lección: los tests deben verificar el comportamiento
  del usuario, no la implementación.
- **Sign-up captura email y nombre reales** (bug P0-8: antes todos compartían `placeholder@quipu.pe`).
  La contraseña interna es aleatoria y el usuario no la conoce (gap registrado).
- `USER_ALREADY_EXISTS` en sign-up → redirect `/sign-in?email=X&reason=exists` con banner "Ya tienes cuenta".
- `passkeyClient()` y `convexClient()` en `auth/auth-client.ts` son obligatorios (sin ellos Better Auth no conecta con Convex).

---

## 6. Estándares de código

> Guías de buenas prácticas del proyecto (obligatorias al escribir o revisar código):
> skills **`vercel-react-best-practices`** (performance React/Next: bundle, rerender, server,
> async, hydration) y **`next-best-practices`** (convenciones de archivos, boundaries RSC,
> data patterns, metadata, error handling, route handlers, imágenes/fuentes). Cárgalas con
> la tool `skill` cuando escribas o refactores componentes, páginas o data fetching.

### 6.1 Clean code

- **Un archivo = una responsabilidad.** Componentes renderizan JSX; funciones puras computan
  (`lib/`); hooks orquestan (`hooks/`); server actions mutan (`actions.ts`). Nunca mezclar.
- **Cero GOD COMPONENTS / GOD FILES.** >200 líneas o 3+ componentes exportables → dividir.
  Un componente por archivo.
- **Lógica de negocio fuera del componente.** El componente llama a la función/hook; no contiene el algoritmo.
- **KISS + DRY + YAGNI.** La solución más simple que funciona; no anticipar futuro; si dos
  componentes comparten lógica se extrae, si no comparten, no.

### 6.2 SOLID aplicado a este stack

- **SRP:** un módulo Convex por dominio; una función pura por archivo en `lib/`; un componente por archivo.
- **OCP:** variantes por composición (props/children), no por flags booleanos proliferando
  (ver skill `vercel-composition-patterns`).
- **LSP/ISP/DIP:** en la práctica — interfaces pequeñas entre capas (wrappers `actions.ts`/`queries.ts`
  como único contrato UI↔backend); los módulos dependen de abstracciones tipadas (schemas Zod,
  tipos generados), no de implementaciones internas de Convex.

### 6.3 Reglas concretas

- **Naming:** componentes `PascalCase.tsx`; hooks `useCamelCase.ts`; tipos `PascalCase` sin prefijo `I`;
  constantes globales `UPPER_SNAKE_CASE`, configs de módulo `camelCase`.
- **Imports:** alias `@/` siempre; prohibido `../../../` (más de 2 niveles).
- **Comentarios:** explican el **por qué**, no el qué. TODOs con `// TODO(nombre):`.
- **Idiomas:** español en UI y mensajes de error (español peruano); inglés en código (variables, funciones, tipos).
- **Dinero:** céntimos enteros, siempre vía `shared/lib/money.ts`. Nunca `amount * 100` a mano.
- **Fechas:** timezone `America/Lima`, siempre vía `shared/lib/date.ts`. Nunca `new Date()` directo para fechas del usuario.
- **Env:** acceso validado vía `core/env.ts`. `NEXT_PUBLIC_*` en cliente; el resto solo servidor. Todo lo público es hostil.
- **Biome** formatea y lintea. No discutir comillas ni punto y coma con él.
- **React Compiler:** no `memo`/`useMemo`/`useCallback` "por las dudas" — el profiler decide.

### 6.4 Forms

**TanStack Form + Zod resolver** solo cuando: 3+ campos con validación cruzada, o estado
complejo (arrays dinámicos, dependencias entre campos).
**No usar** cuando: 1–2 campos independientes (`useState` + `safeParse` inline basta) o solo hay un submit.

### 6.5 Testing

- Vitest 4 + Testing Library + jsdom. Script: `pnpm test`.
- **TDD donde aplique** (skill `test-driven-development`): funciones puras de dominio siempre
  con tests primero (referencia: `convex/lib/budgetMath.test.ts`, `modules/onboarding/lib/__tests__/`).
- Los tests verifican **comportamiento del usuario**, no implementación (lección P0-7, §5.4).
- Mockear solo en el borde; no testear lo que Convex ya garantiza.

---

## 7. Flujo de trabajo con IA

### 7.1 Modo por defecto (siempre activos)

- **`caveman` (full):** respuestas cortas, sin filler, sin hedging, sin tablas decorativas,
  sin narrar tool calls. Tokens importan.
- **`ponytail` (full):** la solución más corta que funciona. Cuestionar si la tarea necesita
  existir. Reusar antes que re-implementar. Diff mínimo.
- Persisten en cada respuesta. Solo se apagan con `"stop caveman"` / `"stop ponytail"`.

### 7.2 Skills de proceso (cargar con la tool `skill` cuando apliquen)

| Skill | Cuándo |
|---|---|
| `using-superpowers` | **Siempre al inicio de cada conversación.** Establece cómo encontrar y usar el resto. |
| `brainstorming` | Antes de feature nueva, refactor mayor o diseño. |
| `writing-plans` | Spec o requirements para tarea multi-step, antes de tocar código. |
| `test-driven-development` | Implementar features o fix bugs (TDD donde aplique). |
| `systematic-debugging` | Bug, test failure, comportamiento inesperado. |
| `verification-before-completion` | Antes de afirmar que algo funciona / pasa / está listo. |
| `requesting-code-review` | Al cerrar trabajo significativo. |
| `receiving-code-review` | Al recibir feedback de review, antes de implementar. |
| `cavecrew` | Delegar a subagentes con 2+ tareas independientes. |
| `writing-skills` | Crear o editar skills. |

**Regla:** si una skill matchea la tarea, se carga **antes** de actuar. No improvisar el rigor.

**Skills técnicas de referencia frecuente:** `vercel-react-best-practices` y
`next-best-practices` (guías de código, §6), `zod` (schemas), `convex` + familia
(`convex-migration-helper`, `convex-performance-audit`, `convex-create-component`),
`shadcn`, `tailwind-v4-shadcn`, `accessibility`, `better-auth-best-practices`.

### 7.3 gstack (herramienta principal de flujo)

[gstack](https://github.com/garrytan/gstack) está instalado globalmente (`~/gstack`).
Son comandos `/` que orquestan el ciclo de vida del desarrollo. **Uso preciso por momento:**

**Explorar y planificar (antes de construir):**

| Skill | Cuándo usarla |
|---|---|
| `/office-hours` | Idea o problema difuso, antes de escribir spec. Primer paso de cualquier feature grande. |
| `/autoplan` | Planificación autónoma multi-step cuando el camino es claro y largo. |
| `/plan-ceo-review` | Revisar un plan desde valor de negocio (¿vale la pena?). |
| `/plan-eng-review` | Revisar un plan desde ingeniería (¿es sólido técnicamente?). |
| `/plan-design-review` | Revisar un plan desde diseño (¿respeta el canon §3?). |
| `/plan-devex-review` | Revisar un plan desde experiencia de desarrollo. |
| `/cso` | Revisión estratégica (Chief Strategy Officer) de dirección del producto. |

**Diseño:**

| Skill | Cuándo usarla |
|---|---|
| `/design-consultation` | Consulta puntual de diseño (una pantalla, un patrón). |
| `/design-shotgun` | Explorar múltiples variantes de diseño en paralelo. |
| `/design-html` | Generar prototipo HTML de una pantalla (como `quipu-2.html`). |
| `/design-review` | Revisión UI/UX de algo ya construido contra el canon. |

**Ejecución y calidad:**

| Skill | Cuándo usarla |
|---|---|
| `/investigate` | Investigar el codebase o un bug antes de tocar nada. |
| `/qa` | QA visual y funcional de una feature (con fixes). |
| `/qa-only` | QA sin fixes (solo reporte). |
| `/review` | Code review estructurado de un diff/PR. |
| `/benchmark` | Medir rendimiento (antes/después de optimizaciones). |
| `/careful` | Modo cauteloso: menos cambios, más confirmación. |
| `/freeze` · `/guard` · `/unfreeze` | Congelar archivos contra edits / proteger críticos / descongelar. |
| `/codex` | Delegar una subtarea acotada a Codex CLI. |

**Release:**

| Skill | Cuándo usarla |
|---|---|
| `/ship` | Preparar y abrir PR (cuando se abran PRs contra la rama de trabajo). |
| `/land-and-deploy` | Merge y deploy. |
| `/canary` | Verificación post-deploy. |
| `/document-release` · `/document-generate` | Documentar un release / generar documentación. |

**Web y sesión:**

| Skill | Cuándo usarla |
|---|---|
| `/browse` | **TODA navegación web.** Prohibido usar MCP/browser tools alternativos. |
| `/connect-chrome` · `/setup-browser-cookies` | Conectar Chrome existente / configurar cookies. |
| `/setup-deploy` · `/setup-gbrain` | Configurar pipeline de deploy / memoria persistente. |
| `/retro` · `/learn` | Retrospectiva de sesión / capturar aprendizajes. |
| `/gstack-upgrade` | Actualizar gstack. |
| `/devex-review` | Revisión de experiencia de desarrollo del repo. |

### 7.4 Manuales de sistema (`docs/manuales-de-sistema.md`)

6 system prompts canónicos. **No se mezclan en una misma sesión.** Si aplica, se copia íntegro.

| Manual | Cuándo |
|---|---|
| 1. Chequeo de Seguridad (Arranque) | Arranque de proyecto o nueva superficie (auth, pagos, jobs). |
| 2. Fable Plan (El Interrogador) | Antes de diseñar una feature o aceptar un reporte de bug. |
| 3. Abogado del Diablo | Revisión adversarial de un plan, diseño o PR. |
| 4. El Fixer (RCA) | Bug no trivial, intermitente, o "ya estaba así". |
| 5. El Optimizador de Rendimiento y Refactor | Llevar código que "ya funciona" a estándar de producción. |
| 6. Guardián de CI/CD y Despliegue | Antes de cualquier release o cambio de pipeline. |

### 7.5 Workflow canónico de una feature

```
1. /office-hours o brainstorming     → cerrar el espacio del problema
2. Spec (docs/superpowers/specs/)    → diseño aprobado por el usuario
3. writing-plans                     → plan multi-step ejecutable
4. /plan-eng-review + /plan-design-review (si aplica)
5. TDD por slices                    → test-driven-development
6. verification-before-completion    → evidencia antes de afirmar
7. /review + /qa                     → calidad
8. Actualizar §8 de este documento   → estado y roadmap al día
```

---

## 8. Estado actual y roadmap

> Auditoría ejecutada el **2026-07-20** contra el código real (no contra planes).
> Esta sección se actualiza cada vez que se cierra o descubre trabajo. Es el reemplazo
> del antiguo `pending-work.md`.

### 8.1 Política de branching (vigente desde 2026-07-16)

**Nada va a `main` hasta que la app esté 100% completa.** La rama de trabajo absorbe todo
el desarrollo. Los P0 bloquean el **release del producto**, no un merge. Esta política se
revisa solo cuando el usuario declare la app completa.

### 8.2 Qué existe hoy (auditado)

**Implementado:**
- **Bloque 1 — Auth:** `/sign-in` + `/sign-up` (canon redesign, passkey-first, split-panel).
  Smoke test manual de 11 casos documentado (§9.3).
- **Bloque 2 — Onboarding v3:** wizard de 3 pasos en `/onboarding` (`modules/onboarding/`
  completo: provider, shell, steps por perfil, reparto 50/30/20, éxito; lógica pura con tests).
  Gates server-side: `/onboarding`↔`/dashboard` redirigen según exista profile.
- **Backend v2.5 completo:** schema migrado (sin `workerType`/`frequency`), `createIncomeEvent`,
  `createCommitmentsBulk`, `payFrequency` de 4 valores, coach suggest-only, funciones puras con tests.
- **Migración de datos v2.0→v2.5 ejecutada** (widen→migrate→narrow, backfills idempotentes;
  helpers de backfill eliminados tras el narrow).
- **Bloque 3 — Dashboard:** `modules/dashboard/`, 5 niveles §3.7, coach P1-5, cascada P1-1.
- **Bloque 4 — Registrar gasto:** variantes A/B en `modules/expenses/`; variante C diferida.
- **Bloque 5 — Ingresos:** `/income/register` con preview, chips, confirmación con deltas.
- **Bloque 6 — Ahorros:** `/savings` + `/savings/fund`; hero Fondo, metas (máx 6), aporte manual.
- **Coach (Bloque 7):** 4 estados + `applyRescueTransfer` (P1-2) + CTAs advertencia/crisis activos (P1-10).
- **Tokens diseño §3.3:** migrados a `@theme` en `app/globals.css` (P1-6).
- **Motor de cascada de compromisos** (P1-1).

**No existe todavía:**
- Bloques 8–9 completos (gamificación, perfil/ajustes).
- Theme switcher funcional en UI (tokens listos; selector no implementado).
- Variante C de gasto (automático).
- Sistema de componentes codificado tipo Storybook (primitivos shadcn sí existen).

### 8.3 Pendientes (estados corregidos tras auditoría)

**P0 — bloquean el release del producto:**

| Item | Qué | Estado real | Detalle condensado |
|---|---|---|---|
| P0-1 | Smoke test manual E2E del browser | ✅ Cerrado (2026-07-21) | Automatizado en Playwright: `__tests__/e2e/smoke.p0.spec.ts` (4 flujos @smoke). Pre: `npx convex dev` + `pnpm dev`. Correr: `pnpm test:e2e:smoke`. |
| P0-2 | Onboarding consume `incomeModel` | ✅ Cerrado | — |
| P0-3 | Endurecer campos v2.5 a required | ✅ Cerrado (2026-07-21) | `profiles.incomeModel`, `financialCycles.totalIncomeReceived`, `fixedCommitments.dueDay` required en schema. Backfill one-shot: `npx convex run migrations/backfillRequiredV25:backfillRequiredV25Fields` (correr antes del push si hay datos legacy). |
| P0-4 | Eliminar `workerType`/`frequency` | ✅ Cerrado (verificado: grep limpio) | — |
| P0-5 | Rutas `/onboarding` y `/dashboard` | ✅ Cerrado (existen con gates) | — |
| P0-7 | Detección de passkey (WebAuthn, no UVPA) | ✅ Cerrado (hotfix `72b7020`) | — |
| P0-8 | Email real en sign-up | ✅ Cerrado (canon redesign) | — |
| P0-9 | `payFrequency` a 4 valores | ✅ Cerrado (verificado en schema) | — |
| P0-10 | Mutation `createCommitmentsBulk` | ✅ Cerrado (existe en `fixedCommitments.ts`) | — |

**P1 — próximo a hacer:**

| Item | Qué | Detalle condensado (5-8 líneas) |
|---|---|---|
| P1-1 | Motor de cascada de compromisos (`mixed`/`variable`) | ✅ **Cerrado 2026-07-21.** `computeCommitmentCoverage` + TDD (covered/partial/not-started/overdue). Schema `coveredAt` / `coveredBy`. Evaluación en `createIncomeEvent` / `deleteIncomeEvent`. Query `getCommitmentCoverage`. Dashboard con progreso real (barra + % parcial). |
| P1-2 | `applyRescueTransfer` + confirmación del coach | ✅ **Cerrado 2026-07-21.** `applyRescueTransfer({interactionId})` + `dismissRescueSuggestion`; validación pura en `convex/lib/rescueTransfer.ts` (TDD); `resolveNudgeAction(suggest_rescue)` guarda sugerencia y deja pending; UI diálogo 2 botones en `modules/coach/`. |
| P1-3 | Actualizar arquitectura a v2.5 | ✅ **Superseded por este documento maestro** (2026-07-20). |
| P1-4 | Bloque 3 — Dashboard | ✅ **Cerrado 2026-07-21.** `convex/dashboard.getSummary`, `modules/dashboard/`, shell sidebar+bottom nav+FAB, 5 niveles §3.7, empty state sin ciclo + **early cycle** (`detectEarlyCycle`: ciclo activo sin gastos → layout completo con badges Recién empiezas/Contigo y empty states por sección), skeletons LCP. Cobertura compromisos vía motor P1-1 (barra + % parcial). |
| P1-5 | Coach: estados advertencia y sugerencia | ✅ **Cerrado 2026-07-21.** `convex/lib/coachState.ts` (`resolveCoachPresentation`, TDD), pending nudge → `suggestion`, `warning` vía compliance, `crisis` vía failed/uncovered; copy suggest-only sin emojis en `WANTS_OVERFLOW_60`; UI ámbar + fila propia en `coach-card.tsx`. |
| P1-6 | Migrar tokens de diseño a Tailwind `@theme` | ✅ **Cerrado 2026-07-21.** Tokens §3.3 en `app/globals.css` (`@theme` + `:root`): neutros, acento `--qp*`, sobres, estados (warning ámbar + crisis terracota), sombras (`shadow-amber`, `shadow-crisis`), aliases `--qpA`…`--qp25` para theme switcher. Hex eliminados en `coach-card`, auth y onboarding. |
| P1-7 | Bloque 4 — Registrar gasto | ✅ **Cerrado 2026-07-21.** Variantes A/B: `modules/expenses/` (keypad, sugerencia sobre, confirmación con saldo restante), CTAs dashboard activos (FAB, header, tarjetas needs/wants, coach early). Variante C diferida (sin detección automática). TDD `keypad` + `envelopeSuggestion`; smoke E2E UI. |
| P1-8 | Bloque 5 — Ingresos | ✅ **Cerrado 2026-07-21.** `/income/register` full-screen; preview 3 sobres + disponible hoy; chips origen → `createIncomeEvent`; confirmación con deltas; CTAs empty/header/FAB; TDD `impactPreview`; smoke E2E ingreso. |
| P1-9 | Bloque 6 — Ahorros | ✅ **Cerrado 2026-07-21.** `/savings` + `/savings/fund`; hero Fondo (Prioridad, progreso 3 meses), detalle con stats, `contributeToSubEnvelope`, `createSavingsGoal` (máx 6 metas), TDD `savingsMath`; nav Ahorros activa. Ajustar aporte y aporte a metas custom en UI diferidos. |
| P1-10 | Bloque 7 — Coach CTAs advertencia/crisis | ✅ **Cerrado 2026-07-21.** Warning: `/income/register` + scroll sobres. Crisis: `applyCoverFromCycleSavings`, `postponeCommitmentForCycle`, `snoozeCrisisCoach`; `crisisResolution` (TDD), `coverageBoost`/`postponedForCycleId`; UI `coach-crisis-actions`. Tranquilo CTAs y pantalla coach dedicada diferidos. |

**P2 — backlog:**

| Item | Qué | Estado/Detalle |
|---|---|---|
| P2-1 | Política de `docs/` en `.gitignore` | ✅ Resuelto 2026-07-20: `.gitignore` quirúrgico — `docs/` se commitea; solo se ignora el ledger local `.superpowers/sdd/`. |
| P2-2 | `HORIZON_DAYS` (15) hardcoded vs configurable | ⬜ Decisión diferida. Recomendación: dejar hardcoded hasta tener telemetría. |
| P2-3 | Auditoría de vistas que leen campos viejos | ✅ Cerrado (grep de `workerType`/`frequency` limpio al 2026-07-20). |
| P2-5 | Extraer AuthHeader a shared | ✅ Cerrado sin implementar (sin duplicación real). |
| P2-6 | Deuda de lint (13 errors + 31 warnings) | ⬜ Pendiente. Offenders: `!` non-null en `auth/auth-server.ts`, `as any` en betterAuth, parse error CSS `oklch(...)` en `globals.css`. Cierre: `pnpm lint` en 0/0 (excluyendo `convex/_generated/`). Bloqueará CI cuando se endurezca. |

### 8.4 Delta diseño v3.0 vs código (backlog de UI por bloque)

| Bloque | Delta a cerrar |
|---|---|
| 1. Auth | Pantallas auxiliares (recovery, error, loading, success); panel lateral "Disponible hoy" muestra datos reales cuando exista dashboard. |
| 2. Onboarding | Alinear copy y micro-detalles con §3.7; sin divergencia mayor. |
| 3. Dashboard | "Ver todo" movimientos. |
| 4. Registrar gasto | Variante C (automático) cuando exista pipeline de detección. |
| 5. Ingresos | Selector de fecha retroactiva (fuera de v2.5). |
| 6. Ahorros | Aporte a metas custom desde UI; "Ajustar aporte" del fondo. |
| 7. Coach | Tranquilo CTAs ("Ver detalle", "Guardar de más"); pantalla/nav Coach dedicada. |
| 8. Gamificación | Todo desde cero: racha, logros, recompensas, personalización. |
| 9. Perfil/Ajustes | Plan Quipu Plus (Polar.sh), preferencias, gestión de passkeys, ciclo y porcentajes editables. |

### 8.5 Regla de actualización de esta sección

1. Al cerrar un item: marcar ✅ con fecha.
2. Al descubrir trabajo nuevo: agregarlo como item condensado (qué, archivos, criterio de cierre) en la prioridad que corresponda. No mover prioridades sin discutir.
3. Al terminar un bloque: actualizar §3.7 (tabla de estados) y §8.2/§8.4.
4. Nunca dejar estados escritos sin verificarlos contra el código (lección de esta auditoría: el doc viejo decía P0-9/P0-10 pendientes y ya estaban hechos).

---

## 9. Operación

### 9.1 Comandos

```bash
# Desarrollo (2 terminales)
pnpm dev                    # Next dev server
npx convex dev              # Convex backend en dev

# Validación (antes de commit/PR)
pnpm tsc --noEmit           # Typecheck (obligatorio, 0 errores)
pnpm lint                   # Biome lint (sin warnings nuevos)
pnpm format                 # Biome format
pnpm test                   # Vitest
pnpm test:e2e               # Playwright (todos)
pnpm test:e2e:smoke         # Playwright P0 smoke (@smoke, 4 flujos)

# Convex
npx convex dashboard        # UI de Convex
npx convex deploy --prod    # Deploy a producción
npx convex ai-files install # Refrescar bloque managed de AGENTS.md
```

### 9.2 Checklist antes de commit/PR

1. `pnpm tsc --noEmit` — sin errores.
2. `pnpm lint` — sin warnings nuevos.
3. Si tocaste `convex/schema.ts` → regenerar tipos (`npx convex dev`) y commitear `convex/_generated/`.
4. Nueva env var → `core/env.ts` con Zod.
5. Nuevo error → enum `ErrorCode` en `core/errors/index.ts`.
6. Commit: imperativo, <50 chars en subject, sin punto final.
7. Actualizar §8 de este documento si cerraste o descubriste trabajo.

### 9.3 Smoke test manual de auth (11 casos)

**Pre-requisitos:** `npx convex dev` + `pnpm dev`; Chrome (WebAuthn) y Firefox (sin passkey platform);
cuenta limpia (borrar el user de Better Auth en Convex dashboard entre runs).

**Rutas activas:** `/sign-in` (2-step inline + passkey) · `/sign-up` (3 pasos inline) ·
`/auth` → redirect · `/sign-in?email=X&reason=exists` (email pre-cargado + banner).

| # | Caso | Esperado |
|---|---|---|
| A | Sign-up nuevo (nombre+email → "Crear cuenta" → "Crear passkey" → autorizar) | Check verde + "Tu cuenta está lista" → CTA aterriza en `/onboarding` (wizard real) |
| B | Sign-up con email existente | Redirect `/sign-in?email=X&reason=exists` + banner "Ya tienes cuenta" + login OK → `/dashboard` |
| C | Sign-in con passkey (usuario con profile) | Redirect directo a `/dashboard`, sin status card |
| D | Sign-in conditional autofill (Chrome) | Autofill ofrece passkey → autenticar → `/dashboard` sin tocar botones |
| E | Sign-in email+password 2-step | Paso password con pill editable "Usar otro correo" → redirect según profile |
| F | Credencial inválida | Banner "No pudimos iniciar sesión" + campo con `aria-invalid` → corregir → éxito |
| G | Passkey cancelado/expirado | Cancelar = silencio; expirar = banner "No pudimos verificar tu passkey" → fallback password |
| H | Server error en sign-up (Convex caído) | Banner "No pudimos crear tu cuenta" → re-intentar → éxito |
| I | Browser sin passkeys (Firefox) | No aparece CTA passkey ni separador; email→password funciona |
| J | Sesión ya activa + deep link a `/sign-in` | Redirect a `/dashboard` (o `/onboarding` sin profile); nunca ve el form |
| K | Responsive <1024px | Sin panel lateral; logo arriba; título "Bienvenido de vuelta." serif; gradientes por paso en sign-up |

**No se prueba aquí:** sign-up con contraseña elegida
(status quo: passkey-first con contraseña aleatoria interna).

### 9.3.1 Smoke test P0 automatizado (Playwright)

**Pre-requisitos:** `npx convex dev` + `pnpm dev` corriendo (Playwright no levanta el dev server en local).

**Comando:** `pnpm test:e2e:smoke`

| # | Flujo | Qué verifica |
|---|---|---|
| 1 | Dashboard carga | `/dashboard` muestra "Disponible hoy" o empty state post-onboarding sin errores de hidratación |
| 2 | `getMyProfile` | Query retorna profile con `incomeModel`, `onboardingComplete`, `currencyCode` |
| 3 | Registrar gasto | `registerExpense` persiste gasto y dispara coach `WANTS_OVERFLOW_60` |
| 4 | Resolver coach | `resolveNudgeAction` marca interacción como resuelta |

Auth vía API (`sign-up/email` + `convex/token`). Cada test crea usuario único aislado.

### 9.4 Deploy y entorno

- Deploy Convex: `npx convex deploy --prod`. Front: Vercel (pendiente pipeline formal — ver Manual 6 cuando se configure).
- Env vars validadas en `core/env.ts`. Secretos solo en servidor; `NEXT_PUBLIC_*` es hostil.
- `convex/_generated/` es autogenerado: **nunca editar a mano**.
- Turbopack es default; ante un bug raro de build, descartar con `next dev --turbopack=false`.

---

## 10. Referencias

### 10.1 Documentos vivos (fuera de este maestro)

| Documento | Rol |
|---|---|
| `docs/nextjs_knowledge.md` | Modelo mental Next.js 16: RSC, caché, PPR, streaming. Referencia profunda de §4.6. |
| `docs/manuales-de-sistema.md` | 6 system prompts de rigor (uso en §7.4). |
| `docs/superpowers/plans/` · `specs/` | Histórico de planes y specs ejecutados (migración v2.5, auth, onboarding v3). Consulta, no edición. |
| `docs/migrations/2026-07-07-v25-migration.md` | Runbook de la migración de datos v2.0→v2.5. |
| `quipu-2.html` (raíz) | Canvas visual oficial del diseño: los 9 bloques renderizados en web y móvil + theme switcher. Fuente de §3. |
| `convex/_generated/ai/guidelines.md` | Guías de la API de Convex (leer antes de tocar `convex/`). Se regenera con `npx convex ai-files install`. |

### 10.2 Documentos absorbidos y eliminados (2026-07-20)

| Documento eliminado | Dónde vive ahora su contenido |
|---|---|
| `docs/quipu.md` (manifiesto) | §2 |
| `docs/quipu-design.md` (canon v3.0) | §3 |
| `docs/color-map-quipu2.md` | §3.3, §3.4 |
| `docs/arquitectura.md` | §4, §5 |
| `docs/auth-smoke.md` | §9.3 |
| `docs/superpowers/plans/2026-07-08-v25-pending-work.md` | §8 (con estados corregidos contra el código) |

El historial git preserva sus versiones originales.

---

## Changelog de este documento

- **2026-07-21 — §8 P1-10.** Bloque 7 Coach CTAs advertencia/crisis (`crisisResolution`, `coach-crisis-actions`, mutations cover/postpone/snooze).
- **2026-07-21 — §8 P1-9.** Bloque 6 Ahorros implementado (`/savings`, `/savings/fund`, `convex/savings.ts`).
- **2026-07-20 — v1.0.** Creación. Consolida 6 documentos en fuente única (opción híbrida
  aprobada por el usuario: absorbe operativos, mantiene referencias puras e histórico).
  Auditoría previa corrigió estados fantasma (P0-4/P0-9/P0-10 cerrados de facto; P0-3 sigue
  abierto; P1-3 superseded por este doc). Se agregaron P1-4/P1-5/P1-6 al roadmap.

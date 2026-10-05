---
name: ui-review
description: Review Agendic UI code against its interface rules (accessibility, forms, copy, dates, mobile). Reports findings as file:line, fixes nothing.
argument-hint: <file-or-pattern>
disable-model-invocation: true
---

# UI review

Review these files: $ARGUMENTS. If none are given, ask which screen to review.

Read every file in scope, apply every rule below to each one, then report. This is a report: change no files.

Rules marked **(Agendic)** come from this project and win over any generic UI guideline that says otherwise, including Vercel's `web-design-guidelines` if it is added later.

## Rules

### Accessibility

- Icon-only buttons have `aria-label` in Spanish; decorative `lucide-react` icons have `aria-hidden="true"`.
- Every form control has a `<label htmlFor>` (or the shadcn `Label`) or an `aria-label`.
- Actions are `<button>`, navigation is `<Link>`. A `<div>`/`<span>` with `onClick` is a finding.
- Images have `alt`; `alt=""` when decorative. Imágenes de Sucursal describe the place, not the file.
- Headings go in order (`h1` → `h2` → `h3`), one `h1` per page.
- Inline async feedback (validation, "Guardando…") sits in an `aria-live="polite"` region. `sonner` toasts already announce themselves.

### Focus

- Every interactive element shows focus with `focus-visible:ring-*` or equivalent.
- `outline-none` is a finding only when no `focus-visible:` replacement sits beside it. The shadcn primitives in `app/_components/ui/` already pair them; check custom classes.
- Dialogs and sheets return focus to their trigger when closed (Radix does this; hand-rolled overlays usually don't).

### Forms

- Inputs carry the right `type`, `name` and `autocomplete`: the Cliente's email is `type="email" autoComplete="email"`, their name `autoComplete="name"`, a Código de verificación `autoComplete="one-time-code"`.
- `spellCheck={false}` on emails, codes and the slug of an Enlace de reserva.
- Paste is never blocked.
- The submit button stays enabled until the request starts, then shows progress ("Guardando…") and blocks a double submit.
- **(Agendic)** A back error meant for the user (e.g. the 409 Enlace de reserva en uso) shows under its field, and focus moves to the first field with an error. A back failure shows the generic notice with **Reintentar**, never the back's technical message (`docs/specs/errores-del-back.md`).
- **(Agendic)** Long editors (Availability, Servicio) warn before leaving with unsaved changes.

### Destructive actions (Agendic)

- Cancelar, Rechazar turno, Dar de baja, dejar de ofrecer a Servicio, and revoking an Invitación go through a confirmation (`AlertDialog`) that names what is lost: "Se cancela el Turno de Ana del lunes 6 a las 10:00".
- The confirm button names the action ("Cancelar turno"), not "Aceptar" or "Sí".

### Dates and times (Agendic)

- Every date or time shown is formatted with `Intl.DateTimeFormat('es-AR', { timeZone })`, where `timeZone` is the Sucursal's `timeZone`. Formatting with the browser's zone, or with a hardcoded `'America/Argentina/Buenos_Aires'`, is a finding.
- A client component that formats a date the server also rendered avoids hydration mismatch: format on the server and pass the string down, or format with an explicit `timeZone`.
- Prices go through `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`, never `'$' + n`.
- Hours and prices in columns or lists use `tabular-nums`.

### Content

- Text that comes from users (Negocio name, Servicio name, Comentario del Turno, Cliente name) survives very short and very long values: `truncate`, `line-clamp-*` or `break-words`, with `min-w-0` on flex children.
- Every list has an empty state that says what to do next ("Creá servicios para que tus clientes reserven"), not a blank area.
- Loading states end in `…` (the single character, not `...`).

### Copy (Agendic)

- Spanish with voseo: "Reservá", "Elegí", "No tenés". Mixing in "tú" forms ("Reserva", "Elige", "No tienes") is a finding.
- Sentence case: "Crear negocio", not "Crear Negocio". Glossary nouns keep the capital they have in `../CONTEXT.md`.
- Use the `CONTEXT.md` term, never one from its _Avoid_ list: "Turno", not "cita" or "reserva"; "Cancelar", not "eliminar"; "Enlace de reserva", not "link del negocio"; "Horas laborables" on screen for an Availability.
- Error messages say what to do next: "Ese horario se ocupó. Elegí otro.", not "Error 409".
- Buttons name their action ("Reservar turno", "Enviar invitación"), not "Continuar" or "Aceptar".

### Navigation and state

- Filters, tabs and pagination in the panel (e.g. the Turnos filters) live in the URL query, so a reload or a shared link keeps them.
- `<Link>` for anything that navigates, so Ctrl+click and middle-click work.

### Mobile (Agendic: the Cliente reserves from a phone)

- Applies to everything under `app/business/` and `app/(public)/`.
- Tap targets are at least 44×44 px (Horario reservable chips, day pickers, the Reservar button).
- No horizontal scroll at 360 px width.
- `autoFocus` never opens the keyboard on page load.
- Images use `next/image` with `width`/`height` or `fill` + `sizes`; the above-the-fold Sucursal photo has `priority`.

### Motion

- Animations honor `prefers-reduced-motion` (`motion-reduce:` in Tailwind).
- `transition-all` is a finding; list the properties.

## Output

Group by file, `file:line - finding`, terse. Skip the explanation unless the fix is non-obvious. A file with no findings gets `✓ pass`. No preamble.

```text
## app/business/[negocioSlug]/[sucursalSlug]/_components/TimeStep.tsx

TimeStep.tsx:42 - icon button missing aria-label
TimeStep.tsx:88 - time formatted without the Sucursal's timeZone

## app/(app)/bookings/_components/BookingActions.tsx

✓ pass
```

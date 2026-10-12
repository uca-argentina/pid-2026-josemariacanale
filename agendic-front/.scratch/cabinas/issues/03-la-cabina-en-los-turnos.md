## Parent

#255 (spec "Cabinas")

## Dónde trabajar

En `agendic-front/`, con las reglas de `agendic-front/CLAUDE.md`. El glosario está en `../CONTEXT.md`, los ADRs en `../docs/adr/` y el spec en `../.scratch/cabinas/spec.md` (#255). Importan **Cabina**, **Mis turnos**, **Enlace del Turno** y **Dar de baja**, y el ADR 0030.

## What to build

El Empleado ve en qué Cabina es cada Turno: el nombre en la lista de Mis turnos y en el detalle del Turno. Un Turno sin Cabina no muestra nada. El Cliente sigue sin ver la Cabina en ninguna parte.

Además, cuando el Dueño intenta dar de baja una Cabina con Turnos futuros, ve un mensaje claro: "Esta Cabina tiene N Turnos próximos. Reagendalos o cancelalos antes de darla de baja.".

### Contrato del back

Lo implementan #258 y #259; está en `../docs/adr/0007-endpoints-de-la-api.md`.

- `GET /users/me/bookings` (Mis turnos), `GET /businesses/:id/bookings` y la respuesta de `PATCH /bookings/:id/reschedule` traen `cabin: { id, name } | null`. Una Cabina dada de baja se sigue mostrando con su nombre.
- El Enlace del Turno (`ClientBooking`) **no** trae la Cabina.
- `DELETE /cabins/:id` → 409 `Cabin <id> has <n> upcoming Turnos` si la Cabina tiene Turnos pendientes o aceptados que todavía no terminaron. Exige Sesión y es solo del Dueño.

### Qué hace el front

- Los modelos de Turno del panel (el de Mis turnos y el del listado del Negocio) suman `cabin`.
- La lista y el detalle muestran `cabin.name` junto a la Sucursal o al Servicio.
- El repositorio de Cabinas traduce el 409 de la baja a un error de entidad con la cantidad de Turnos. La action de dar de baja de #260 lo muestra con el mensaje de arriba.

## Acceptance criteria

- [ ] La lista de Mis turnos y el detalle del Turno muestran el nombre de la Cabina; nada si es `null`.
- [ ] El Enlace del Turno no cambia.
- [ ] Dar de baja una Cabina con Turnos futuros muestra el mensaje con la cantidad.
- [ ] Tests del esquema o modelo de Turno con `cabin`, del repositorio (traducción del 409 con la cantidad) y de la action de baja.
- [ ] `npx tsc --noEmit` y `npm test` pasan.

## Blocked by

- #259 (Cabinas · back 04: Reagendar mueve la Cabina, y se ve en el panel)
- #260 (Cabinas · front 01: Cabinas de la Sucursal)

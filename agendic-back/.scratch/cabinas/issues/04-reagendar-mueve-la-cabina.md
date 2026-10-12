## Parent

#255 (spec "Cabinas")

## Dónde trabajar

En `agendic-back/`. El glosario está en `../CONTEXT.md`, los ADRs en `../docs/adr/` y el spec en `../.scratch/cabinas/spec.md` (#255). Importan **Cabina**, **Reagendar**, **Enlace del Turno**, **Mis turnos** y **Empleado elegido**. ADRs:

- ADR 0022: el Enlace del Turno.
- ADR 0023: Mis turnos.
- ADR 0026: el Empleado elegido.
- ADR 0030: la Cabina.
- ADR 0007: endpoints.

## What to build

Reagendar un Turno, lo haga el Empleado o el Cliente por el Enlace del Turno, tiene en cuenta su Cabina. El panel muestra en qué Cabina es cada Turno, y el Cliente nunca la ve.

### Comportamiento

- **Reagendar** (`PATCH /bookings/:id/reschedule` y `PATCH /booking-links/:secret/reschedule`), con el conjunto de Cabinas que el Servicio admite hoy:
  - si la Cabina del Turno sigue en el conjunto y está libre en el horario nuevo, la conserva;
  - si no (está ocupada o ya no está en el conjunto), pasa a otra libre con la regla de Reservar: la que hace más tiempo que no recibe un Turno de cualquier Servicio, desempate por menor id;
  - un Turno con `cabinId` null de un Servicio que ahora admite Cabinas recibe una de la misma forma;
  - si el Servicio ya no admite Cabinas, el Turno queda con `cabinId` null;
  - el horario que el propio Turno ocupaba cuenta como libre, también para su Cabina;
  - el Empleado y la Cabina se resuelven por separado. Un Turno con Empleado elegido conserva su regla de hoy y además necesita una Cabina libre;
  - si no queda Cabina libre, es el mismo 422 `Slot <ISO> is not available for Service <id>`.
- **Vistas del panel**: `cabin: { id, name } | null` en:
  - `GET /users/me/bookings` (Mis turnos);
  - `GET /businesses/:id/bookings` (listado del Negocio);
  - la respuesta de `PATCH /bookings/:id/reschedule`.

  Una Cabina dada de baja se sigue mostrando con su nombre en los Turnos que la ocupan.
- **El Cliente no la ve**: ni `GET /booking-links/:secret` ni ninguna respuesta del Enlace del Turno (`ClientBooking`) exponen la Cabina. Tampoco `POST /bookings`.
- Sumarlo a `../docs/adr/0007-endpoints-de-la-api.md`, en la sección de Bookings (`RescheduleBookingDto` y las respuestas).

### Qué necesita el front

El front muestra `cabin.name` en el detalle del Turno y en la lista de Mis turnos, y no muestra nada si es `null`.

## Acceptance criteria

- [ ] Reagendar por las dos vías conserva la Cabina si está libre, pasa a otra si no, asigna una a un Turno sin Cabina y deja null si el Servicio ya no admite Cabinas.
- [ ] Reagendar dentro del mismo horario (o solapado con el propio) no se bloquea por la Cabina del propio Turno.
- [ ] 422 si no queda Cabina libre en el horario nuevo.
- [ ] `cabin` sale en Mis turnos, en el listado del Negocio y en la respuesta de Reagendar; no sale en el Enlace del Turno ni en `POST /bookings`.
- [ ] Specs HTTP de Turnos, Enlace del Turno y Mis turnos cubriendo lo anterior.
- [ ] ADR 0007 actualizado.
- [ ] `npm test` pasa entero.

## Blocked by

- #258 (Cabinas · back 03: Reservar ocupa una Cabina)

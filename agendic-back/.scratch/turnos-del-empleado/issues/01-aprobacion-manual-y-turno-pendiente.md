# 01: Aprobación manual y Turno pendiente

**Spec:** `../../../../.scratch/turnos-del-empleado/spec.md`
**ADR relevante:** actualizar `../../../../docs/adr/0007-endpoints-de-la-api.md`

**Dónde trabajar:** `agendic-back/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`).

**What to build:** un Servicio puede pedir Aprobación manual de sus Turnos. Cuando la pide, un
Turno recién verificado por el Cliente no queda `BOOKED` solo: queda como Turno pendiente, y el
Empleado asignado lo Acepta o lo Rechaza.

**Blocked by:** Ninguno (puede arrancar ya).

- [ ] `Service` gana `requiresApproval: Boolean` (default `false`). Crear/actualizar Servicio lo
      aceptan; la respuesta de Servicio lo incluye.
- [ ] `BookingStatus` gana `PENDING` y `REJECTED`.
- [ ] `POST /bookings/verification`: si `service.requiresApproval` es `true`, el Turno pasa a
      `PENDING` en vez de `BOOKED`. Si es `false`, sigue igual que hoy (`BOOKED`).
- [ ] La exclusion constraint `Booking_no_overlap` (hoy solo sobre `BOOKED`, ver ADR 0004) pasa a
      cubrir `PENDING` y `BOOKED`: dos Turnos que se solapan para el mismo Empleado no pueden
      coexistir si al menos uno de los dos está `PENDING` o `BOOKED`. Actualizar la migración SQL a
      mano (Prisma no expresa esta constraint, ver header de `schema.prisma`) y el comentario/ADR
      0004 que la documenta.
- [ ] `GET /services/:id/slots`: el paso que descuenta Turnos `BOOKED` pasa a descontar también
      `PENDING`.
- [ ] `POST /bookings` (crear Turno) sigue igual: nace `UNVERIFIED` sin importar `requiresApproval`
      (la Aprobación manual solo actúa después de la Verificación de email).
- [ ] Nuevos endpoints, con Sesión, solo el Empleado asignado a ese Turno (403 si no lo es, 404 si
      el Turno no existe):
  - `PATCH /bookings/:id/accept` — `PENDING → BOOKED`; 422 si el Turno no está `PENDING`.
  - `PATCH /bookings/:id/reject` — `PENDING → REJECTED`, libera el horario; 422 si el Turno no está
    `PENDING`.
- [ ] `docs/adr/0007-endpoints-de-la-api.md` actualizado: `requiresApproval` en Services, los dos
      endpoints nuevos en Bookings, el estado `PENDING`/`REJECTED` en el ciclo de vida del Turno, y
      la nota de que `PENDING` también ocupa el horario en la sección de Slots.
- [ ] Tests HTTP: verificar un Turno de un Servicio con `requiresApproval` → `PENDING`, no `BOOKED`;
      sin `requiresApproval` → sigue igual que hoy; Aceptar/Rechazar un Turno que no está `PENDING`
      → 422; ejecutado por un Empleado que no es el asignado → 403; `GET /services/:id/slots` no
      ofrece un horario ocupado por un Turno `PENDING`; dos `POST /bookings/verification` que
      dejarían dos Turnos `PENDING`/`BOOKED` solapados para el mismo Empleado → el segundo 409.

**Nota:** en paralelo puede estar avanzando
`agendic-back/.scratch/reserva-real-por-sucursal/issues/03-sena-y-comentario-del-turno.md` (otra
spec, agrega `Booking.notes` y `Service.depositPercent`). Son cambios ortogonales sobre las mismas
tablas: si el otro ticket ya mergeó, rebasear el schema y el ADR 0007 contra eso en vez de pisarlo.

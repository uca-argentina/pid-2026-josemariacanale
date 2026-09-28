# 02: Mis turnos del Empleado (listado, Cancelar, Reagendar, Ausencia)

**Spec:** `../../../../.scratch/turnos-del-empleado/spec.md`
**ADR relevante:** actualizar `../../../../docs/adr/0007-endpoints-de-la-api.md`

**Dónde trabajar:** `agendic-back/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`).

**What to build:** el endpoint self-service para que un Empleado vea todos sus propios Turnos
(en cualquier Negocio del que sea Empleado activo), más las acciones que le faltan sobre un Turno ya
aceptado: Cancelar, Reagendar y marcar Ausencia.

**Blocked by:** Ninguno (no depende del ticket 01; comparte el mismo Empleado-actor pero actúa sobre
Turnos `BOOKED`, no `PENDING`).

- [ ] Nuevo método en el repositorio de Empleados para resolver "los Empleados activos de este
      Usuario" (no existe hoy: `EmployeesRepository` solo resuelve por `id` de Empleado o por
      Negocio). Un Usuario puede ser Empleado activo de varios Negocios a la vez.
- [ ] `GET /employees/me/bookings` — con Sesión, sin parámetro de ruta: resuelve el Usuario actual,
      junta los Empleados activos que tiene, y lista todos sus Turnos (cualquier estado). Lista
      vacía si el Usuario no es Empleado activo de ningún Negocio (no error).
  - Respuesta por Turno: `{ id, status, startsAt, endsAt, clientName, clientEmail, noShowAt,
    serviceId, serviceName, businessId, businessName, branchId, branchName }`.
- [ ] `Booking` gana `noShowAt: DateTime?` (nullable, no reemplaza `status`).
- [ ] Nuevos endpoints, con Sesión, solo el Empleado asignado a ese Turno (403 si no lo es, 404 si
      el Turno no existe):
  - `PATCH /bookings/:id/cancel` — `BOOKED → CANCELLED`, libera el horario; 422 si el Turno no está
    `BOOKED`.
  - `PATCH /bookings/:id/reschedule` — mueve un Turno `BOOKED` a otro Horario reservable del mismo
    Servicio y el mismo Empleado (no cambia de profesional); body `{ startsAt: ISO date-string }`;
    revalida que el nuevo horario exista según las mismas reglas que `GET /services/:id/slots`
    (Franjas/Anulaciones/Sucursal) y no choque con otro Turno `PENDING`/`BOOKED` del Empleado → 409
    si choca; mantiene `BOOKED`, no repite la Verificación de email; 422 si el Turno no está
    `BOOKED`.
  - `PATCH /bookings/:id/no-show` — marca `noShowAt` con la hora actual; 422 si el Turno no está
    `BOOKED`, o si `endsAt` todavía no pasó, o si ya tiene `noShowAt`.
- [ ] `docs/adr/0007-endpoints-de-la-api.md` actualizado: sección nueva para
      `GET /employees/me/bookings` bajo Employees (o una sección propia "Mis turnos"), y los tres
      endpoints nuevos bajo Bookings.
- [ ] Tests HTTP: `GET /employees/me/bookings` de un Usuario Empleado activo en dos Negocios trae
      los Turnos de ambos con su `businessId`/`branchName` correctos; de un Usuario sin ningún
      Empleado activo → `200` con lista vacía; Cancelar/Reagendar/Ausencia sobre un Turno que no
      está `BOOKED` → 422; ejecutados por otro Empleado que no es el asignado → 403; Reagendar a un
      horario que choca con otro Turno del mismo Empleado → 409; Ausencia antes de que pase `endsAt`
      → 422, después → guarda `noShowAt`.

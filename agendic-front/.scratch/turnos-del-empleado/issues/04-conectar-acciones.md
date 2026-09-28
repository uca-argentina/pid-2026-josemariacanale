# 04: Conectar Aceptar/Rechazar/Cancelar/Reagendar/Ausencia

**Spec:** `../../../../.scratch/turnos-del-empleado/spec.md`
**ADR relevante:** `../../../../docs/adr/0007-endpoints-de-la-api.md`

**Dónde trabajar:** `agendic-front/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`),
reglas de esta app en `agendic-front/CLAUDE.md`.

**What to build:** `BookingActions.tsx` y `BookingDetail.tsx` dejan de mutar un `useState` local
(comentario `ponytail` existente en ambos archivos: "se reemplaza por la server action cuando exista
el endpoint") y pasan a llamar acciones reales contra el back.

**Blocked by:** back ticket 01 (Aceptar/Rechazar), back ticket 02 (Cancelar/Reagendar/Ausencia),
front ticket 03 (necesita el Turno real ya cargado para poder actuar sobre él).

**Contrato del back a consumir** (todas con Sesión, Bearer del Clerk JWT; 403 si el Usuario logueado
no es el Empleado asignado a ese Turno, 404 si el Turno no existe):

- `PATCH /bookings/:id/accept` — sin body. `PENDING → BOOKED`. 422 si el Turno no está `PENDING`.
- `PATCH /bookings/:id/reject` — sin body. `PENDING → REJECTED`. 422 si el Turno no está `PENDING`.
- `PATCH /bookings/:id/cancel` — sin body. `BOOKED → CANCELLED`. 422 si el Turno no está `BOOKED`.
- `PATCH /bookings/:id/reschedule` — body `{ startsAt: ISO date-string }`. 409 si el nuevo horario
  choca con otro Turno del Empleado; 422 si el Turno no está `BOOKED`.
- `PATCH /bookings/:id/no-show` — sin body. 422 si el Turno no está `BOOKED`, si `endsAt` no pasó
  todavía, o si ya tiene Ausencia marcada.

**Acceptance criteria:**

- [ ] Cada acción es una server action (`'use server'`) que llama a su controlador
      (`getInjection('IAcceptBookingController')`, etc.), sigue el patrón ya usado en
      `app/(app)/business/actions.ts`: `unstable_rethrow(error)` primero, después mapea errores de
      dominio conocidos por `instanceof` a `{ ok: false, message }`, reporta lo inesperado con
      `ICrashReporterService`, y revalida la página tras una mutación exitosa.
- [ ] Aceptar/Rechazar visibles solo en un Turno pendiente; Cancelar/Reagendar/Ausencia visibles
      solo en uno aceptado con las condiciones que correspondan (Ausencia solo si `endsAt` ya pasó).
- [ ] Reagendar abre el mismo flujo de elección de Horario reservable que usa la reserva pública
      (pide `GET /services/:id/slots` para el Servicio y el Empleado actual, muestra los días sin
      horario con su motivo) y al confirmar llama a `PATCH /bookings/:id/reschedule` con el horario
      elegido.
- [ ] El botón "Pedir reagendamiento" se elimina de `BookingActions.tsx` (no tiene endpoint ni
      concepto de dominio; ver Out of Scope del spec).
- [ ] El 409 de Reagendar se muestra como "elegí otro horario" (error recuperable), sin reportarse
      al crash reporter.
- [ ] Tests unitarios por capa con puertos stubeados: cada server action arma el body/ruta
      correctos y mapea 403/404/409/422 al resultado que puede mostrar la UI; adaptador de
      `bookings.repository.ts` para estas cinco rutas (200/204 esperado, errores mapeados a
      dominio).

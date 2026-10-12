## Parent

#255 (spec "Cabinas")

## Dónde trabajar

En `agendic-back/`. El glosario está en `../CONTEXT.md`, los ADRs en `../docs/adr/` y el spec en `../.scratch/cabinas/spec.md` (#255). Importan **Cabina**, **Horario reservable**, **Reservar**, **Tiempo de preparación**, **Empleado elegido** y **Servicio del Negocio**. ADRs:

- ADR 0004: las exclusion constraints y cómo llegan a Prisma (P2039 / `23P01`). Hay que seguir la misma traducción de errores que `Booking_no_overlap`.
- ADR 0021: la ocupación es por Usuario.
- ADR 0026: el Empleado elegido.
- ADR 0030: la Cabina.
- ADR 0007: endpoints.

## What to build

Un Turno de un Servicio que admite Cabinas ocupa una de ellas. Los Horarios reservables descuentan los horarios en que no queda ninguna Cabina libre del Servicio; al Reservar, Agendic asigna una Cabina libre. Postgres garantiza que dos Turnos no ocupen la misma Cabina a la vez. Desde acá, no se puede Dar de baja una Cabina con Turnos futuros.

### Modelo

- `Booking.cabinId` (nullable, FK a `Cabin`). Los Turnos existentes quedan en null.
- Exclusion constraint escrita a mano, `Booking_cabin_no_overlap`: `EXCLUDE USING gist ("cabinId" WITH =, tstzrange("prepStartsAt", "endsAt") WITH &&) WHERE ("cabinId" IS NOT NULL AND status IN ('PENDING','BOOKED'))`. Es gemela de `Booking_no_overlap`, con intervalos semiabiertos. Su violación se traduce al mismo error de dominio de horario ocupado que `Booking_no_overlap`.

### Comportamiento

- **Horarios reservables** (`GET /services/:id/slots`, y el mismo cálculo que usan Reservar y Reagendar):
  - en un Servicio con Cabinas, el horario de un Empleado vale solo si alguna Cabina del Servicio no tiene un Turno `PENDING` o `BOOKED` que se solape con `[inicio − prepMinutes, inicio + durationMinutes)`;
  - los Turnos de cualquier Servicio ocupan la Cabina;
  - un Servicio sin Cabinas no cambia;
  - con `employeeId` (Empleado elegido) se exige ese Empleado más cualquier Cabina libre.
- **Asignación** (`POST /bookings`, que crea el Turno ya verificado):
  - el Empleado se elige con la regla de hoy;
  - después se elige la Cabina entre las del Servicio libres en ese tramo: la que hace más tiempo que no recibe un Turno (`PENDING` o `BOOKED`) de cualquier Servicio;
  - sin Turnos previos gana esa, y si empatan, la de menor id;
  - se guarda en `Booking.cabinId`. Un Servicio sin Cabinas guarda null.
- **Carrera**: si dos verificaciones toman la última Cabina a la vez, la constraint rechaza la segunda con el mismo error que hoy da `Booking_no_overlap`.
- **Dar de baja una Cabina**: `DELETE /cabins/:id` da 409 `Cabin <id> has <n> upcoming Turnos` si tiene Turnos `PENDING` o `BOOKED` con `endsAt` posterior a ahora.

### Contrato

No cambia ninguna respuesta. `GET /services/:id/slots` ofrece menos horarios; `POST /bookings` sigue dando 422 `Slot <ISO> is not available for Service <id>` cuando no hay Cabina libre. `POST /bookings` **no** expone la Cabina. Sumar a `../docs/adr/0007-endpoints-de-la-api.md` la regla de las Cabinas en Slots y Bookings, y el 409 de `DELETE /cabins/:id`.

### Qué necesita el front

Nada nuevo para Reservar: el flujo público no cambia. El front muestra el 409 de baja en la pantalla de Sucursales.

## Acceptance criteria

- [ ] Migración con `Booking.cabinId` y `Booking_cabin_no_overlap`; `npx prisma generate` y `npx tsc --noEmit` pasan.
- [ ] `GET /services/:id/slots` no ofrece un horario en que todas las Cabinas del Servicio están ocupadas, incluido el Tiempo de preparación y los Turnos de otros Servicios; sí lo ofrece si queda una libre; un Servicio sin Cabinas no cambia.
- [ ] Con Empleado elegido, se exige ese Empleado y una Cabina libre.
- [ ] `POST /bookings` asigna la Cabina con la regla (la que hace más tiempo que no recibe un Turno, desempate por menor id) y da 422 si no queda ninguna.
- [ ] `DELETE /cabins/:id` da 409 con Turnos futuros y 204 si solo tiene Turnos pasados, cancelados o rechazados.
- [ ] Spec contra la base real: la constraint rechaza dos Turnos solapados en la misma Cabina (también por la preparación), acepta dos que se tocan y acepta uno cancelado encima; la violación sale como el error de dominio de horario ocupado.
- [ ] Specs HTTP de slots, Turnos y Cabinas cubriendo lo anterior; los fixtures de Turno suman `cabinId: null`.
- [ ] ADR 0007 actualizado.
- [ ] `npm test` pasa entero.

## Blocked by

- #257 (Cabinas · back 02: El Servicio admite Cabinas)

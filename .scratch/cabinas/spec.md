## Problem Statement

Un Negocio con Sucursales que tienen espacios o equipos limitados (tres boxes de masajes, una sola camilla, un láser) no puede decírselo a Agendic. Hoy un Horario reservable solo depende de que haya un Empleado libre: si dos Empleados atienden un Servicio que se hace en el único box de la Sucursal, Agendic deja Reservar dos Turnos a la misma hora, y el Negocio se entera recién cuando llegan los dos Clientes. El Dueño termina limitando a mano cuántos Empleados Ofrecen cada Servicio o cancelando Turnos, y ninguna de las dos cosas sirve cuando el mismo espacio lo usan Servicios distintos.

## Solution

El Dueño carga las **Cabinas** de cada Sucursal (espacios o equipos) y elige qué Cabinas admite cada Servicio del Negocio. Un Turno de un Servicio que admite Cabinas ocupa una de ellas mientras dura, con su Tiempo de preparación, y dos Turnos no pueden ocupar la misma Cabina a la vez, con la misma regla que ya protege al Empleado. Un Horario reservable necesita entonces un Empleado libre y una Cabina libre. Agendic asigna la Cabina sola al Reservar y la mueve al Reagendar si hace falta. El Cliente no la elige ni la ve; el Empleado la ve en Mis turnos. Un Servicio sin Cabinas funciona exactamente como hoy.

## User Stories

1. Como Dueño, quiero cargar las Cabinas de cada Sucursal con un nombre, para que Agendic sepa qué espacios y equipos tengo.
2. Como Dueño, quiero ver la lista de Cabinas de cada Sucursal en la pantalla de Sucursales, para saber qué tengo cargado.
3. Como Dueño, quiero renombrar una Cabina, para corregir un error o reflejar un cambio en el local.
4. Como Dueño, quiero que Agendic no me deje tener dos Cabinas activas con el mismo nombre en una Sucursal, sin importar mayúsculas, para no confundirlas.
5. Como Dueño, quiero poder repetir el nombre de una Cabina en otra Sucursal, porque "Box 1" existe en cada local.
6. Como Dueño, quiero poder reusar el nombre de una Cabina dada de baja, para reemplazarla por otra.
7. Como Dueño, quiero Dar de baja una Cabina que ya no existe, para que deje de usarse en los Turnos nuevos.
8. Como Dueño, quiero que Agendic no me deje Dar de baja una Cabina con Turnos futuros y me diga cuántos tiene, para no dejar a un Cliente sin lugar sin darme cuenta.
9. Como Dueño, quiero que al Dar de baja una Cabina salga de todos los Servicios que la admitían.
10. Como Dueño, quiero elegir qué Cabinas de su Sucursal admite cada Servicio del Negocio, para que solo se reserve cuando hay lugar.
11. Como Dueño, quiero que un Servicio pueda admitir varias Cabinas, para que se reserve en cualquiera libre.
12. Como Dueño, quiero que un Servicio pueda admitir una sola Cabina, para los equipos únicos como el láser.
13. Como Dueño, quiero que varios Servicios compartan la misma Cabina, para que un Turno de masajes y uno de limpieza facial no se pisen en el mismo box.
14. Como Dueño, quiero que un Servicio sin Cabinas siga funcionando como hoy, para no tener que cargar Cabinas si no las necesito.
15. Como Dueño, quiero quitarle una Cabina a un Servicio sin que se toquen sus Turnos ya tomados, porque esos Turnos siguen siendo válidos.
16. Como Dueño, quiero que Agendic no me deje asignarle a un Servicio una Cabina de otra Sucursal o dada de baja.
17. Como Usuario con Servicios personales, quiero que mis Servicios personales no tengan Cabinas, porque no tienen Sucursal.
18. Como Cliente, quiero ver solo Horarios reservables en los que hay lugar, para no Reservar un Turno que después el Negocio tenga que cancelar.
19. Como Cliente, quiero que la Cabina no me haga elegir nada nuevo al Reservar, porque para mí es un detalle interno del Negocio.
20. Como Cliente que entra por el Enlace de reserva de un Empleado, quiero ver los horarios en que ese Empleado está libre y además hay una Cabina libre.
21. Como Cliente, quiero que dos personas que Reservan el último lugar a la vez no terminen las dos con Turno, para no llegar a un box ocupado.
22. Como Dueño, quiero que la Cabina se asigne repartiendo el uso (la que hace más tiempo que no recibe un Turno, de cualquier Servicio), para que no se gaste siempre el mismo equipo.
23. Como Dueño, quiero que el Tiempo de preparación ocupe también la Cabina, porque preparar el box es parte de preparar el Turno.
24. Como Empleado, quiero que al Reagendar un Turno conserve su Cabina si sigue libre, para no mover a nadie sin necesidad.
25. Como Empleado, quiero que al Reagendar a un horario en que su Cabina está ocupada pase a otra libre del Servicio, para no perder el horario.
26. Como Cliente, quiero Reagendar por el Enlace del Turno solo a horarios con lugar, con la misma regla que el Empleado.
27. Como Empleado, quiero que un Turno tomado antes de que su Servicio admitiera Cabinas reciba una al Reagendarlo, para regularizarlo.
28. Como Empleado, quiero ver en Mis turnos en qué Cabina es cada Turno, para saber adónde llevar al Cliente.
29. Como Empleado, quiero ver la Cabina en el detalle del Turno.
30. Como Dueño, quiero ver la Cabina de cada Turno en el listado de Turnos del Negocio.
31. Como Empleado, quiero ver qué Cabinas admite un Servicio que atiendo, aunque no pueda cambiarlas.
32. Como Cliente, no quiero ver la Cabina en el Enlace del Turno ni en la Confirmación de reserva, porque es un dato interno.

## Implementation Decisions

- **Glosario y ADRs** (ya commiteados en la rama): término **Cabina** en `CONTEXT.md`, con _Avoid_ recurso, sala, box, equipo y puesto. Horario reservable y Dar de baja la mencionan. ADR 0030 "La Cabina es una segunda ocupación del Turno"; ADR 0004 apunta a la constraint nueva; la fila de `docs/agents/domain.md` fija los identificadores `Cabin`, `ServiceCabin`, `Booking.cabinId`, `cabinIds` y `cabins`.
- **Modelo**:
  - `Cabin` (`id`, `branchId`, `name`, `deletedAt`), con un único parcial sobre `(branchId, lower(name))` entre las no dadas de baja, escrito a mano en la migración.
  - `ServiceCabin` (`serviceId`, `cabinId`), el conjunto que admite un Servicio del Negocio.
  - `Booking.cabinId` (nullable).
  - La exclusion constraint `Booking_cabin_no_overlap` sobre `(cabinId, tstzrange(prepStartsAt, endsAt))` para Turnos `PENDING` o `BOOKED` con `cabinId` no nulo, gemela de `Booking_no_overlap`.
- **Una sola Cabina por Turno**, elegida del conjunto del Servicio. No se atan Cabina y Empleado: se eligen por separado.
- **Horarios reservables**: un horario de un Empleado vale solo si además hay una Cabina del Servicio libre en `[horario − preparación, horario + duración)`. Un Servicio sin Cabinas no cambia. Con Empleado elegido se exige ese Empleado más cualquier Cabina libre.
- **Asignación al Reservar**: primero el Empleado, con la regla de hoy; después, entre las Cabinas del Servicio libres en ese tramo, la que hace más tiempo que no recibe un Turno de cualquier Servicio. Si nunca recibió uno gana esa, y si empatan, la de menor id. Si la constraint salta por una carrera, es el mismo 422/409 de horario ocupado que con el Empleado.
- **Reagendar** (Empleado y Enlace del Turno): conserva la Cabina si sigue libre en el horario nuevo; si no, pasa a otra libre con la misma regla. Un Turno sin Cabina de un Servicio que ahora las admite recibe una. Se recalcula con el conjunto actual del Servicio.
- **Turnos anteriores** a que el Servicio admitiera Cabinas: quedan con `cabinId` null y no ocupan ninguna.
- **Quitar una Cabina de un Servicio** no toca los Turnos que ya la ocupan.
- **Dar de baja una Cabina**: soft-delete (`deletedAt`). Da 409 si tiene Turnos `PENDING` o `BOOKED` con `endsAt` futuro. Si no, la saca de todos los `ServiceCabin`.
- **Contrato de la API** (se suma al ADR 0007):
  - `GET /branches/:id/cabins` (Sesión; solo el Dueño): las Cabinas activas de la Sucursal, ordenadas por nombre. 403 si no es el Dueño, 404 si la Sucursal no existe.
  - `POST /branches/:id/cabins` `{ name }`: 201 con `{ id, branchId, name }`. 409 `Cabin name <name> already in use in Branch <id>`. 400 si el nombre está vacío o tiene más de 60 caracteres.
  - `PATCH /cabins/:id` `{ name }`: 200 con la Cabina, mismo 409. 404 si no existe o está dada de baja.
  - `DELETE /cabins/:id`: 204. 409 `Cabin <id> has <n> upcoming Turnos` (desde el ticket de Reservar). 404 si no existe o ya está dada de baja.
  - Servicio del Negocio: `cabinIds?: number[]` en `POST /branches/:id/services` y en `PATCH /services/:id`; si viene, reemplaza el conjunto. 422 `Cabin <id> is not an active Cabin of Branch <id>`. En un Servicio personal, 422 `A personal Service has no Cabins`.
  - El Servicio responde `cabins: [{ id, name }]` en las vistas del panel (catálogo `GET /employees/me/services`, y las respuestas de crear, editar, Ofrecer y dejar de ofrecer), no en las públicas (`GET /branches/:id/services`, `by-slug`, `u/...`).
  - Turno: `cabin: { id, name } | null` en `GET /users/me/bookings` y en `GET /businesses/:id/bookings`. Nunca en el Enlace del Turno (`ClientBooking`) ni en `POST /bookings`.
  - `GET /services/:id/slots`, `POST /bookings` y Reagendar no suman errores: sin Cabina libre el horario no es reservable, y sale el mismo 422 `Slot <ISO> is not available for Service <id>`.
- **Front**:
  - En Business → Sucursales, una sección "Cabinas" por Sucursal: lista, agregar, renombrar y dar de baja.
  - En el detalle del Servicio, una pestaña "Cabinas" con checkboxes de las Cabinas de su Sucursal. La edita el Dueño; un Empleado la ve en solo lectura.
  - El nombre de la Cabina en el detalle del Turno y en la lista de Mis turnos.
  - Errores nuevos en `src/entities/errors`.

## Testing Decisions

- Un buen test mira comportamiento externo (respuesta HTTP, filas en la base, lo que un use case devuelve o tira), no cómo está armado por dentro.
- **Back, seam HTTP** con `createTestApp` (la app Nest con los repositorios mockeados), como en las specs HTTP de slots, Turnos y Servicios. Cubre:
  - una spec nueva de Cabinas;
  - en la de Servicios, `cabinIds` y `cabins`;
  - en la de slots, los horarios sin Cabina libre;
  - en las de Turnos y Enlace del Turno, la asignación al Reservar y al Reagendar;
  - en la de Mis turnos, `cabin`.
- **Back, base real** (`*.db.spec.ts`, como la del repositorio de Turnos): lo que promete la migración. El único de nombre por Sucursal, la constraint `Booking_cabin_no_overlap` traducida al error de dominio, y la cuenta de Turnos futuros de una Cabina.
- **Front**:
  - use cases de Cabinas con el repositorio mockeado (como los de availabilities);
  - el repositorio HTTP, que traduce 409 y 422 a errores de entidad (como `tests/unit/infrastructure/repositories`);
  - las server actions (como las de Sucursales).
  - Sin tests de componentes.

## Out of Scope

- Un Turno que necesita varias Cabinas a la vez (box + láser).
- Horario propio de la Cabina (Availability o Anulaciones de Cabina).
- Que el Cliente elija o vea la Cabina.
- Que el Empleado cambie la Cabina de un Turno sin Reagendarlo.
- Atar Cabinas a Empleados.
- Asignarles Cabina en bloque a los Turnos ya tomados.
- Capacidad mayor a uno por Cabina.
- Métricas de uso de Cabinas en analytics.

## Further Notes

- ADR 0030. El número 0029 queda reservado para "El Turno atendido se marca a mano" (#246).
- #246 (Turno atendido) también toca Booking y sus presenters; quien mergee segundo resuelve el conflicto.

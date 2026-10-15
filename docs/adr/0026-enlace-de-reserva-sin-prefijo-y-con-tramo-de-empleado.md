# Enlace de reserva sin prefijo y con tramo de Empleado

_Ampliada por la ADR 0029: el Empleado elegido sale también de la lista de la página de reserva, con la misma semántica._

Reabre de la ADR 0021 dos cosas: el prefijo `/u/` del Enlace de reserva del Usuario, y que en un Servicio del Negocio el Cliente nunca elige con quién. Amplía la ADR 0014 (tramo de Sucursal) y la ADR 0018 (tramo de Servicio). Spec: #209.

El Enlace de reserva pierde los prefijos del front. El primer tramo es el de un Negocio **o** el de un Usuario, y los dos comparten un solo espacio de nombres:

- Negocio: `/<negocio>`, `/<negocio>/<sucursal>`, `/<negocio>/<sucursal>/<servicio>`. Con una sola Sucursal, `/<negocio>` sigue llevando a ella.
- Usuario: `/<usuario>`, `/<usuario>/<servicio>`.
- Un Servicio del Negocio gana un último tramo opcional, el Enlace de reserva de un Empleado que lo Ofrece (`User.slug`): `/<negocio>/<sucursal>/<servicio>/<empleado>`.

Las direcciones con `/business/` y `/u/` dejan de existir, sin redirigir. Los endpoints de la API `GET /businesses/by-slug/:slug` y `GET /u/:userSlug[/:serviceSlug]` no cambian: el prefijo que se va es el de las URLs del front.

## Un solo espacio de nombres, garantizado por Postgres

`Business.slug` y `User.slug` se registran además en la tabla `BookingSlug`: el slug es la clave primaria y apunta a un Negocio (`businessId`) o a un Usuario (`userId`), nunca a los dos (`CHECK` de exactamente uno; otro `CHECK` lo exige en minúsculas). La unicidad cruzada la hace la clave primaria (ADR 0004), no un chequeo previo en el caso de uso.

- Se escribe en la misma transacción que el alta del Negocio o el cambio del slug (`PrismaBusinessesRepository`, `PrismaUsersRepository`). Un conflicto, contra un Negocio o contra un Usuario, es el 409 `Booking link already in use` de siempre, así el front no cambia cómo lo muestra.
- Cambiar el slug mueve la fila: el anterior queda libre. Cada Negocio y cada Usuario tiene a lo sumo una fila.
- Dar de baja no libera (ADR 0024): la fila queda y el slug sigue ocupado. Un Usuario tampoco puede tomar el slug de su propio Negocio.
- Base de desarrollo recreada, sin backfill (como la ADR 0018).

## Palabras reservadas

`bookings, services, business, availability, analytics, turnos, sign-in, sign-up, api, trpc, u` no valen como slug de Negocio ni de Usuario: 409 `Booking link already in use`. Es una lista fija en el dominio (`RESERVED_SLUGS`), validada por los casos de uso de Crear Negocio, editar el Negocio y editar el Usuario. La Sucursal y el Servicio pueden usarlas: no ocupan el primer tramo.

**Regla: toda ruta nueva de primer nivel del front se suma a esa lista**, en el mismo cambio que crea la ruta. Si no, un Negocio o un Usuario podría tapar la pantalla.

## Resolutor

`GET /slugs/:slug`, sin Sesión, resuelve de quién es un primer tramo con una sola llamada: `{ kind: 'business', business }` (misma forma que `by-slug`) o `{ kind: 'user', user }` (misma forma que `GET /u/:userSlug`). 404 `Booking link <slug> not found` si nadie lo tiene, si es de un Negocio o Usuario dado de baja, o si no tiene formato de slug.

## Empleado elegido

Un Turno reservado por el enlace de un Empleado guarda `Booking.employeeChosen`. El Cliente ve solo los Horarios reservables de esa persona y el Turno queda con ella, sin reasignar si el horario se ocupó. Un Turno con Empleado elegido se Reagenda solo a horarios de ese Empleado, lo Reagende el Cliente o el Empleado; para pasarlo a otro, se Cancela. Si el Empleado deja de Ofrecer el Servicio, los Turnos que ya tiene siguen en pie y el Cliente puede Cancelarlos. Cuenta para el round robin como cualquier otro. Por el enlace de un Empleado que no Ofrece el Servicio (o ya no, o fue dado de baja del Negocio) el Cliente ve "página no encontrada": no se Reserva con otro sin saberlo. Un Empleado sin Enlace de reserva propio (`User.slug` nulo) no tiene enlace directo hasta que lo elige. Esto lo implementan los tickets de #209 que siguen a este.

## Qué no cambia

- Un Servicio oculto se sigue Reservando solo por su propio tramo, también con el tramo de Empleado.
- Las pantallas del panel (`/bookings`, `/services`, `/availability`, `/analytics`, `/business`) siguen siendo del panel: las rutas estáticas les ganan a las dinámicas y sus nombres están en la lista de reservadas.
- El Enlace del Turno (`/turnos/<link>`) no cambia.

## Alternativas descartadas

- **Mover el panel bajo un prefijo** (`/panel/...`) para liberar el primer tramo sin palabras reservadas. Rompe todas las rutas del panel y los enlaces que ya se compartieron; la lista de reservadas es más barata y se mantiene en un solo lugar.
- **Chequear la unicidad en el caso de uso** (buscar el slug en las dos tablas antes de escribir). Tiene carrera entre dos pedidos casi juntos; es justo lo que la ADR 0004 manda dejarle a Postgres.
- **Redirigir `/business/...` y `/u/...`.** Obliga a mantener para siempre dos formas de cada dirección, y `business` y `u` quedarían como primer tramo válido. Se prefiere que dejen de existir.

## Empleado elegido

Entrar por `/<negocio>/<sucursal>/<servicio>/<empleado>` deja un Empleado elegido: el front busca al Empleado por `employees[].slug`, pide los Horarios reservables con `employeeId` y Reserva con `employeeId`. El Turno guarda `Booking.employeeChosen`. Con él (o sin ese tramo, con el Empleado elegido en la lista, ADR 0029) no hay round robin y, si el Empleado no está libre, no se pasa a otro (422). Reagendar, por el Cliente o por el Empleado, solo acepta horarios de ese Empleado; si dejó de Ofrecer el Servicio el Turno sigue en pie pero no se puede Reagendar, solo Cancelar.

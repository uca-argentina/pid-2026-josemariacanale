# Postgres garantiza el no solapamiento de Turnos y Franjas, y las unicidades parciales

Estas reglas las garantizan constraints escritas a mano en el SQL de las migraciones, no el código de la aplicación por sí solo:

- dos Turnos `PENDING` o `BOOKED` del mismo Empleado no se solapan, cada uno contado con su Tiempo de preparación (un Turno pendiente ocupa su horario igual que uno aceptado; como no se puede usar un valor de enum en la misma transacción que lo agrega, la constraint se recrea en una migración aparte), usando intervalos semiabiertos. Es una exclusion constraint sobre `tstzrange("prepStartsAt", "endsAt")`, vía `btree_gist`;
- el nombre de un Servicio es único, sin distinguir mayúsculas, entre los Servicios de una Sucursal que no están dados de baja (`deletedAt` en null);
- un Usuario es Empleado activo de a lo sumo un Negocio a la vez: único por `(userId, businessId)` entre los Empleados que no están dados de baja (`deletedAt` en null). Recontratar a alguien dado de baja crea una fila nueva (ADR 0013);
- un Usuario tiene a lo sumo una Availability predeterminada: único parcial `Availability_userId_default_key` sobre `userId` donde `isDefault`;
- dos Franjas de la misma Anulación (misma Availability y fecha) no se solapan, usando intervalos semiabiertos, así que dos que se tocan (09:00–17:00 y 17:00–18:00) sí entran. Es la exclusion constraint `AvailabilityOverride_no_overlap`, por `(availabilityId, date)`, con un `WHERE` que deja afuera las filas de día libre (las dos horas en null, sin rango que armar); como Postgres no tiene rango de `time`, cada hora se fija a una fecha arbitraria para compararla como `tsrange`.
- `Booking.cancelledAt` solo puede tener valor con `status = CANCELLED` (`Booking_cancelledAt_only_cancelled`), y `Booking.rejectedAt` solo con `status = REJECTED` (`Booking_rejectedAt_only_rejected`): son CHECKs. Los dos los escribe la aplicación con la hora del reloj, al Cancelar o al Rechazar turno.

Las Franjas de una Availability ya no tienen constraint: desde que `AvailabilityInterval.days` es un arreglo (ADR 0020), un exclude no puede comparar los días uno a uno, y el no solapamiento por día lo valida solo la API, que reemplaza todas las Franjas en una transacción.

Un chequeo que vive solo en la aplicación tiene una carrera: dos pedidos concurrentes ven el mismo horario libre y los dos escriben. Una constraint en la base hace la carrera imposible, y sale más barato que tomar locks. Prisma no puede expresar estas constraints en `schema.prisma`, así que viven solo en el SQL de la migración. El diff de Prisma las ignora, así que no va a intentar borrarlas. El precio es que `schema.prisma` no cuenta toda la verdad sobre la base, y el comentario del encabezado de `schema.prisma` apunta acá.

## El Tiempo de preparación entra en la constraint

El Turno guarda `prepStartsAt` (`startsAt` menos el `prepMinutes` de su Servicio), fijado al reservar
igual que `endsAt`, y `Booking_no_overlap` compara `[prepStartsAt, endsAt)` en vez de
`[startsAt, endsAt)`. Así la preparación queda protegida en la base, también entre Servicios distintos
del mismo Empleado y con dos reservas concurrentes, sin que la constraint tenga que leer el Servicio
(una exclusion constraint no puede mirar otra tabla). Cambiar `prepMinutes` no toca los Turnos ya
tomados: cada uno conserva la preparación con la que se reservó. Reagendar sí la recalcula con la del
Servicio de ese momento, porque valida el horario nuevo contra las Franjas con esa misma preparación. Los Turnos anteriores a la columna se migraron con `prepStartsAt = startsAt`.

## El Límite diario no es una constraint

Contar Turnos por día local de la Sucursal no se puede expresar como constraint. Lo chequean Reservar
y el cálculo de Horarios reservables (que también usa Reagendar), y la carrera que importa, dos
verificaciones del mismo Servicio que pasarían el límite juntas, se cierra en la verificación: cuenta
y verifica dentro de una transacción que toma `pg_advisory_xact_lock` por Servicio, así la segunda
espera a que la primera confirme y la cuenta. Reservar no necesita el lock porque un Turno sin
verificar no ocupa lugar. Reagendar no lo toma: un Reagendar y una verificación del mismo Servicio
casi juntos pueden pasar el límite por uno. Se acepta porque Reagendar lo hace el Empleado a mano, y
el costo es un Turno de más ese día, no dos Turnos en el mismo horario.

## Consecuencias

- Los casos de uso igual chequean las reglas por su cuenta. Las constraints son la red de contención para las carreras.
- Los adapters de Prisma tienen que traducir las violaciones de constraint a los mismos errores de dominio que tiraría el caso de uso. La API los devuelve como 409, salvo el solape de Franjas, que es el mismo 422 que da el caso de uso al validarlas. Hasta Prisma 7.10 con `@prisma/adapter-pg` no llegan como códigos crudos de Postgres sino como `Prisma.PrismaClientKnownRequestError`:
  - una violación de índice único (Postgres `23505`) tiene código `P2002`, y el nombre del índice violado está en `meta.driverAdapterError.cause.constraint.index`;
  - la violación de una exclusion constraint (Postgres `23P01`) tiene el código genérico `P2039`, y solo se la reconoce por `meta.driverAdapterError.cause.originalCode === '23P01'`, o por el nombre de la constraint (`Booking_no_overlap`, `AvailabilityInterval_no_overlap`, `AvailabilityOverride_no_overlap`) en el mensaje.
- Una violación de foreign key (Postgres `23503`) llega igual, con código `P2003`. No es ninguna de estas reglas, así que no es un 409. La excepción es `EmployeeService_availabilityId_fkey` (`ON DELETE RESTRICT`, generada por Prisma, no escrita a mano): es la red de la regla "no se borra una Availability que usa algún Servicio", así que borrar una Availability que viola ese FK se traduce al mismo 409 que da el caso de uso. Es el único FK no cascada que apunta a `Availability`.
- Guardar `startsAt` y `endsAt` como `timestamptz` es requisito de la exclusion constraint.
- La Cabina suma una segunda exclusion constraint, `Booking_cabin_no_overlap`, sobre el mismo tramo y por `cabinId` (ADR 0030). Su violación se traduce al mismo error de horario ocupado que `Booking_no_overlap`.
- La Ausencia del Anfitrión suma un CHECK escrito a mano, `Booking_no_show_exclusive`: `noShowAt` y `employeeNoShowAt` no pueden tener valor los dos a la vez (la Ausencia del Invitado y la Ausencia del Anfitrión se excluyen; gana la primera que se marca). Los casos de uso ya lo validan con su 422; el CHECK es la red contra una carrera, y se prueba contra Postgres.
- El Motivo de cancelación suma dos CHECKs escritos a mano: `Booking_cancelledBy_only_cancelled_or_rejected` (`cancelledBy` solo con `status` `CANCELLED` o `REJECTED`) y `Booking_cancellationReason_needs_cancelledBy` (`cancellationReason` solo con `cancelledBy`). Los escribe la aplicación al Cancelar, Rechazar o dar de baja; los CHECKs y el backfill de `acceptedAt` se prueban contra Postgres.
- La Causa de cancelación (ADR 0034) suma `Booking_cancellationCause_only_with_reason`: `cancellationCause` solo con `status` `CANCELLED`, `cancelledBy` `EMPLOYEE` y `cancellationReason` no nulo. Sin backfill. Se prueba contra Postgres.
- La Calificación suma la tabla `BookingRating` con un índice único sobre `bookingId` (un Turno, una Calificación) y un CHECK escrito a mano, `BookingRating_score_range`: `score` va de 1 a 5. El caso de uso valida el puntaje y la regla de qué Turno se puede calificar; el índice y el CHECK son la red contra una carrera, y se prueban contra Postgres.

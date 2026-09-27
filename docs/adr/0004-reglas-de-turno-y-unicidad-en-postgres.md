# Postgres garantiza el no solapamiento de Turnos y Franjas, y las unicidades parciales

Cinco reglas las garantizan constraints escritas a mano en el SQL de las migraciones, no el código de la aplicación por sí solo:

- dos Turnos `BOOKED` del mismo Empleado no se solapan, usando intervalos semiabiertos. Es una exclusion constraint sobre `tstzrange`, vía `btree_gist`;
- el nombre de un Servicio es único, sin distinguir mayúsculas, entre los Servicios de una Sucursal que no están dados de baja (`retiredAt` en null);
- un Usuario es Empleado activo de a lo sumo un Negocio a la vez: único por `(userId, businessId)` entre los Empleados que no están dados de baja (`retiredAt` en null). Recontratar a alguien dado de baja crea una fila nueva (ADR 0013);
- dos Franjas de la misma Availability y el mismo día de la semana no se solapan, usando intervalos semiabiertos, así que dos que se tocan (09:00–17:00 y 17:00–18:00) sí entran. Es la exclusion constraint `AvailabilityInterval_no_overlap`, por `(availabilityId, weekday)`; como Postgres no tiene rango de `time`, cada hora se fija a una fecha arbitraria para compararla como `tsrange`;
- un Empleado tiene a lo sumo una Availability predeterminada: único parcial `Availability_employeeId_default_key` sobre `employeeId` donde `isDefault`;
- dos Franjas de la misma Anulación (mismo Empleado y fecha) no se solapan, mismo mecanismo que las de Availability: `AvailabilityOverride_no_overlap`, por `(employeeId, date)`, con un `WHERE` que deja afuera las filas de día libre (las dos horas en null, sin rango que armar).

Un chequeo que vive solo en la aplicación tiene una carrera: dos pedidos concurrentes ven el mismo horario libre y los dos escriben. Una constraint en la base hace la carrera imposible, y sale más barato que tomar locks. Prisma no puede expresar estas constraints en `schema.prisma`, así que viven solo en el SQL de la migración. El diff de Prisma las ignora, así que no va a intentar borrarlas. El precio es que `schema.prisma` no cuenta toda la verdad sobre la base, y el comentario del encabezado de `schema.prisma` apunta acá.

## Consecuencias

- Los casos de uso igual chequean las reglas por su cuenta. Las constraints son la red de contención para las carreras.
- Los adapters de Prisma tienen que traducir las violaciones de constraint a los mismos errores de dominio que tiraría el caso de uso. La API los devuelve como 409, salvo el solape de Franjas, que es el mismo 422 que da el caso de uso al validarlas. Hasta Prisma 7.10 con `@prisma/adapter-pg` no llegan como códigos crudos de Postgres sino como `Prisma.PrismaClientKnownRequestError`:
  - una violación de índice único (Postgres `23505`) tiene código `P2002`, y el nombre del índice violado está en `meta.driverAdapterError.cause.constraint.index`;
  - la violación de una exclusion constraint (Postgres `23P01`) tiene el código genérico `P2039`, y solo se la reconoce por `meta.driverAdapterError.cause.originalCode === '23P01'`, o por el nombre de la constraint (`Booking_no_overlap`, `AvailabilityInterval_no_overlap`, `AvailabilityOverride_no_overlap`) en el mensaje.
- Una violación de foreign key (Postgres `23503`) llega igual, con código `P2003`. No es ninguna de estas reglas, así que no es un 409. La excepción es `EmployeeService_availabilityId_fkey` (`ON DELETE RESTRICT`, generada por Prisma, no escrita a mano): es la red de la regla "no se borra una Availability que usa algún Servicio", así que borrar una Availability que viola ese FK se traduce al mismo 409 que da el caso de uso. Es el único FK no cascada que apunta a `Availability`.
- Guardar `startsAt` y `endsAt` como `timestamptz` es requisito de la exclusion constraint.

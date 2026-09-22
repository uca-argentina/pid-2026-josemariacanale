# Postgres garantiza el solapamiento de Turnos y la unicidad de nombres sin distinguir mayúsculas

Tres reglas las garantizan constraints escritas a mano en la migración `init`, no el código de la aplicación por sí solo:

- dos Turnos `BOOKED` del mismo Empleado no se solapan, usando intervalos semiabiertos. Es una exclusion constraint sobre `tstzrange`, vía `btree_gist`;
- el nombre de un Servicio es único, sin distinguir mayúsculas, entre los Servicios de una Sucursal que no están dados de baja (`retiredAt` en null);
- el email de un Empleado es único, sin distinguir mayúsculas, entre los Empleados de un Negocio que no están dados de baja (`retiredAt` en null).

Un chequeo que vive solo en la aplicación tiene una carrera: dos pedidos concurrentes ven el mismo horario libre y los dos escriben. Una constraint en la base hace la carrera imposible, y sale más barato que tomar locks. Prisma no puede expresar estas constraints en `schema.prisma`, así que viven solo en el SQL de la migración. El diff de Prisma las ignora, así que no va a intentar borrarlas. El precio es que `schema.prisma` no cuenta toda la verdad sobre la base, y el comentario del encabezado de `schema.prisma` apunta acá.

## Consecuencias

- Los casos de uso igual chequean las reglas por su cuenta. Las constraints son la red de contención para las carreras.
- Los adapters de Prisma tienen que traducir las violaciones de constraint a los mismos errores de dominio, que la API devuelve como 409. Hasta Prisma 7.10 con `@prisma/adapter-pg` no llegan como códigos crudos de Postgres sino como `Prisma.PrismaClientKnownRequestError`:
  - una violación de índice único (Postgres `23505`) tiene código `P2002`, y el nombre del índice violado está en `meta.driverAdapterError.cause.constraint.index`;
  - la violación de la exclusion constraint de solapamiento (Postgres `23P01`) tiene el código genérico `P2039`, y solo se la reconoce por `meta.driverAdapterError.cause.originalCode === '23P01'`, o por el nombre `Booking_no_overlap` en el mensaje.
- Una violación de foreign key (Postgres `23503`) llega igual, con código `P2003`. No es ninguna de estas reglas, así que no es un 409.
- Guardar `startsAt` y `endsAt` como `timestamptz` es requisito de la exclusion constraint.

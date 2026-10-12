# La Cabina es una segunda ocupación del Turno

Un Turno de un Servicio del Negocio que admite Cabinas ocupa, además de al Usuario que lo atiende, exactamente una Cabina de su Sucursal: `Booking.cabinId`, en el mismo tramo `[prepStartsAt, endsAt)`. Un Horario reservable necesita un Empleado libre y una Cabina libre, elegidos por separado.

## Decisiones

- **Una sola Cabina por Turno, elegida de un conjunto.** El Servicio admite un conjunto de Cabinas (`ServiceCabin`) y el Turno ocupa una. Así se cubren "tengo tres boxes y cualquiera sirve" y "este Servicio usa el láser" (un conjunto de uno). No se cubre el Servicio que necesita dos Cabinas a la vez (box + láser): habría que buscar combinaciones en los Horarios reservables y armar una constraint por cada Cabina del Turno.
- **La Cabina no se ata al Empleado.** Cualquier Empleado libre con cualquier Cabina libre. La Cabina se asigna como el Empleado: la que hace más tiempo que no recibe un Turno, pero contando Turnos de cualquier Servicio, porque la Cabina se comparte; si empatan, la de menor id. Reagendar la conserva si sigue libre. El Cliente nunca la elige: no hay "Cabina elegida".
- **Postgres garantiza el no solapamiento**, igual que con el Empleado (ADR 0004): la exclusion constraint `Booking_cabin_no_overlap` sobre `(cabinId, tstzrange(prepStartsAt, endsAt))`, para Turnos `PENDING` o `BOOKED` con `cabinId` no nulo. El Tiempo de preparación ocupa también la Cabina: preparar el box es parte de preparar el Turno.
- **Sin horario propio.** La Cabina no tiene Availability: solo descuenta Horarios reservables de los que dan los Empleados, como la Sucursal, que tampoco tiene horario.

## Qué arrastra

- **Los Turnos tomados antes de que su Servicio admitiera Cabinas quedan sin Cabina** y no ocupan ninguna. Puede que en la realidad una Cabina quede doble; el Dueño lo resuelve Reagendando, y al Reagendarlo el Turno recibe Cabina como uno nuevo. La alternativa (asignarles una al guardar el Servicio y rechazar el cambio si alguno no entra) era lógica nueva y frágil para un caso de transición.
- **Quitar una Cabina de un Servicio no toca sus Turnos**: los que ya la ocupan la conservan.
- **No se puede Dar de baja una Cabina con Turnos futuros** (`PENDING` o `BOOKED` que todavía no terminan): 409. Es una excepción a la regla general de Dar de baja, que cancela. Cancelarle Turnos al Cliente por un cambio interno del local es caro, y pasarlos solos a otra Cabina es otra asignación con sus propias carreras. El Dueño primero los Reagenda o los Cancela.
- **El Cliente no la ve**: no sale en la página pública, en la Confirmación de reserva ni en el Enlace del Turno.

## Descartado

- **Varias Cabinas por Turno**, por lo de arriba.
- **La Cabina como un Empleado más** (un Usuario ficticio con Availability): mezcla personas con espacios y aparecería en el Staff, en Mis turnos y en la asignación.
- **Atar cada Empleado a su Cabina**: obliga a mantener el vínculo cada vez que alguien cambia de box y no sirve para los equipos compartidos.

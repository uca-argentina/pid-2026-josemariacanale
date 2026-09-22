# El Cliente no tiene cuenta: el Turno guarda su nombre y su email, sin verificar hasta que se verifica

Un Cliente no es un Usuario: reserva un Turno con un nombre y un email, sin registrarse. Esos datos viven en el Turno mismo (`Booking.clientName`, `Booking.clientEmail`), no en una cuenta aparte.

Un Turno recién reservado queda `UNVERIFIED` y no retiene su horario: la exclusion constraint de solapamiento (ADR 0004) solo aplica entre Turnos `BOOKED`. Sin esto, cualquiera podría bloquear la agenda de una Sucursal tipeando un email falso en cada horario libre. Verificar el Turno vuelve a chequear todas las reglas de reserva en ese momento, porque pasó tiempo desde que se pidió: el horario puede haberse ocupado, el Empleado puede haber sido dado de baja, el Servicio puede estar retirado. Si dos Clientes pidieron el mismo horario, gana el primero que verifica; la verificación del otro falla el chequeo de solapamiento y devuelve 409.

## Consecuencias

- No hay inicio de sesión, contraseña ni perfil para el Cliente: `clientName` y `clientEmail` son columnas comunes de `Booking`, no una foreign key.
- Un Turno necesita campos de verificación (hash, expiración), de la misma forma que los de un Usuario o un Empleado.
- Dos Turnos del mismo Empleado a la misma hora pueden existir los dos como `UNVERIFIED`; solo uno puede pasar a `BOOKED`.

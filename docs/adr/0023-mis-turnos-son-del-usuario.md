# Mis turnos son del Usuario, no del Empleado

Reabre el alcance de la ADR 0016, que limitó la pantalla de Turnos a "los de todos los Negocios de los que es Empleado activo". Con los Servicios personales (ADR 0021) hay Turnos que atiende un Usuario sin ser Empleado de nadie: su `Booking.employeeId` es `null`, y la lista, que filtraba por Empleado, no los mostraba nunca.

Mis turnos pasa a ser del Usuario: `GET /users/me/bookings` lista los Turnos por `Booking.userId`, que todo Turno tiene. Entran los de sus Servicios personales y los de los Negocios donde sigue siendo Empleado activo. Se borra `GET /employees/me/bookings`.

Los Turnos de un Negocio que lo dio de baja quedan afuera, como antes: las acciones sobre ellos ya responden 403, así que mostrarlos dejaría botones que fallan.

Cada Turno trae `business` y `branch` anidados (`{ id, name }`), los dos `null` en un Servicio personal. En código, `EmployeeBooking` pasa a `UserBooking`.

Lo demás de la 0016 sigue: no hay panel de Negocio para un Empleado que no es Dueño.

# Dar de baja un Usuario: se borra en Clerk y queda marcado en Postgres

Cierra lo que el ADR 0009 dejó abierto: "si el borrado de cuenta pasa a ser un caso real del producto, el camino es darlo de baja desde Agendic, no escuchar a Clerk".

El propio Usuario se da de baja desde Agendic. El back marca su fila con `User.deletedAt` y después borra su Usuario en Clerk. Nada se borra de Postgres: sus Turnos, Servicios, Availability y Negocio quedan como historial.

Motivos:

- **Borrar en Clerk y no solo bloquear.** Si la identidad siguiera en Clerk, el email quedaría atrapado: la persona no podría volver a registrarse y Agendic la rechazaría para siempre. Borrándola, un nuevo registro con el mismo email trae otro `clerkId` y crea otro `User` desde cero; no hay conflicto con la fila vieja (`User.email` no es único).
- **Marcar y no borrar en Postgres.** Los Turnos que atendió tienen Clientes que los ven en Mis turnos, y los Negocios necesitan su historial. Borrar en cascada perdería eso.
- **Primero Postgres, después Clerk.** Son dos sistemas sin transacción común. Si Clerk falla después de marcar la fila, el Usuario sigue con identidad pero el back lo rechaza en cada request, y puede reintentar la baja. Al revés, una falla en Postgres dejaba una fila activa sin identidad y sin forma de reintentar.

## Qué arrastra

- Sus Turnos futuros, pendientes y aceptados, quedan cancelados en todos lados, sin mail al Cliente (como las otras bajas).
- Se lo da de baja como Empleado en cada Negocio, aunque sea el último Empleado de un Servicio: ese Servicio queda sin quien lo atienda y sin Horarios reservables hasta que su Dueño ofrezca a otro. La regla de "no se puede dejar de ofrecer siendo el último" sigue valiendo para dejar de Ofrecer; no frena la baja de un Usuario, que no es una decisión del Dueño de ese Servicio.
- Sus Servicios personales quedan dados de baja.
- Si es Dueño, su Negocio queda dado de baja (`Business.deletedAt`) con todo lo suyo: Servicios, Empleados (todos, no solo el Dueño), Turnos futuros e Invitaciones abiertas. Se descartó exigir dar de baja el Negocio antes: no existe esa acción por separado y el Dueño no tendría cómo salir.
- Los Enlaces de reserva del Usuario y del Negocio no se liberan: siguen ocupados por la fila dada de baja y dejan de abrir (404). Un Cliente con un enlace viejo nunca cae en el Negocio de otro.

## Consecuencias

- El back rechaza con 403 cualquier request de un Usuario dado de baja, salvo repetir la baja (que solo reintenta el borrado en Clerk).
- El "eliminar cuenta" del perfil de Clerk tiene que quedar apagado: borraría la identidad sin pasar por el back, que es justo el caso que el ADR 0009 aceptó a disgusto.
- `retiredAt` pasa a llamarse `deletedAt` en `Service` y `Employee` (#120), para que las cuatro bajas (Usuario, Negocio, Servicio, Empleado) usen el mismo nombre; los ADR 0004 y 0013 ya lo nombran así. `User.deletedAt` y `Business.deletedAt` quedan para #121 y #122.

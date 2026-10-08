# El Empleado es un Usuario

Deroga el ADR 0011. El Empleado deja de ser un dato suelto (nombre y email cargados por el Dueño)
y pasa a ser el vínculo entre un Usuario y un Negocio: `userId`, `businessId`, `deletedAt`. Nombre y
email se leen del Usuario. El Dueño es además Empleado de su propio Negocio desde que lo crea, en
la misma transacción.

Agregar un Empleado (`POST /businesses/:id/employees`) recibe solo un email. Si no hay ningún
Usuario con ese email, 422 con un mensaje que pide registrarse; no se crea nada a medias. Dar de
baja a un Empleado (`DELETE /employees/:id`) sigue igual, salvo que el Dueño no puede darse de baja
a sí mismo mientras sea Dueño (422). `PATCH /employees/:id` se elimina: el nombre ya no es un dato
del Empleado, así que no hay nada que el Dueño pueda editarle ahí.

El índice único que impedía dos Empleados con el mismo email en un Negocio se reemplaza por uno
parcial sobre `(userId, businessId)` donde `deletedAt` es null (ADR 0004): una persona activa a la
vez por Negocio, y recontratar a alguien dado de baja crea una fila nueva en vez de chocar con la
vieja.

## Por qué revertir el 0011

El 0011 sacó a los Empleados de Clerk porque nadie los usaba: ningún Empleado iniciaba sesión, y
mantener una Organization por Negocio solo duplicaba datos. Esa razón no cambió, pero **Availability**
(horas laborables por Empleado) necesita alguien a quien preguntarle cuándo trabaja, y "alguien" acá
quiere decir un Usuario identificado, no un nombre y un email sueltos.

## Reversión parcial, a propósito

El 0011 avisaba que revertirlo no era trivial: "vuelve la columna, la invitación y la resolución del
Empleado por token". Esta spec trae **la columna y nada más**. No hay flujo de invitación para un
Empleado que todavía no es Usuario (el Dueño solo puede agregar a alguien que ya se registró por su
cuenta), no hay pantallas para que un Empleado gestione nada, y no hay login por Empleado: sigue
identificando a la Sesión el mismo mecanismo de siempre (Clerk, ADR 0008), y quien atiende un
Servicio ajeno no tiene panel para ese Negocio.

## Consecuencias

- `Employee.name` y `Employee.email` se borran; los presenta siempre el Usuario. `presentEmployee`
  suma `userId` para que el front reconozca al Dueño comparándolo con `Business.ownerId`.
- Migración sin backfill: la base de desarrollo se recrea (ver `docs/agents/domain.md` /
  memoria del proyecto).
- Si un día los Empleados necesitan invitación o pantallas propias, es una spec aparte: esta
  reversión deliberadamente no las trae.

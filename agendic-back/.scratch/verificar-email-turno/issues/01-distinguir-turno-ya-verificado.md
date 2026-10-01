# Distinguir "Turno ya verificado" de "token inválido" al verificar el email

Label: `back`. Parte del spec `verificar-email-turno`.

## Problema

`POST /bookings/verification` responde 422 igual para un token desconocido o vencido y para un token ya usado. El front no puede distinguir los casos: si el Cliente refresca la página o vuelve a tocar el link del mail, ve un error aunque su Turno ya quedó verificado (Turno pendiente o reservado).

## Contrato hoy

- 201 con el Turno cuando el token es válido.
- 422 `Unknown, used or expired verification token` para un token desconocido, usado o vencido, y también cuando el Turno ya no se puede reservar.
- 404 si el Turno ya no existe; 409 si el horario se ocupó mientras tanto.

## Contrato pedido

`POST /bookings/verification`: público, sin Sesión (ADR 0005). Body `{ token }`. Ver `../docs/adr/0007-endpoints-de-la-api.md`.

Un token ya usado, mientras el Turno siga en pie (Turno pendiente o reservado), tiene que ser distinguible de un token inválido. Opciones, a decidir por el back (recomendada: A):

- **A (recomendada). 200 idempotente** (en vez del 201 de la primera verificación) con el mismo cuerpo que la verificación exitosa (el Turno, con su estado: Turno pendiente o reservado). El front no necesita cambios para mostrar éxito.
- **B. 409 con mensaje propio**, por ejemplo `Booking already verified`. Hoy el 409 del front significa "horario ocupado", así que el mensaje tendría que ser inequívoco.

Se mantiene el 422 para token desconocido o vencido, y para un Turno que ya no se puede reservar (Servicio dado de baja, horario pasado, Empleado que ya no lo atiende). Un token ya usado cuyo Turno fue Cancelado o Rechazado sigue siendo 422.

## Qué necesita el front

Mostrar "tu turno ya estaba verificado" en vez del error de link inválido cuando el Cliente repite la verificación.

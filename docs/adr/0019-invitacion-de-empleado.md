# Invitación de Empleado

Deroga en parte el ADR 0013. Agregar un Empleado deja de ser un alta instantánea por email y pasa a ser una **Invitación** que el invitado acepta dentro de la app. Sigue valiendo que el Empleado es el vínculo `userId`/`businessId`; cambia cómo nace.

`POST /businesses/:id/employees` recibe solo un email y crea una Invitación pendiente (ya no un Empleado). Si no hay ningún Usuario con ese email, el back además le pide a Clerk (Invitations) que le mande el mail para crearse una cuenta de Agendic. Quien ya es Usuario no recibe mail: ve la Invitación en la app. En los dos casos el Empleado nace recién al Aceptar invitación, que compara el email de la Sesión con el de la Invitación. Puede rechazarla el invitado y cancelarla el Dueño. Vence a los 7 días.

## Por qué

El 0013 dejaba al Dueño sin salida cuando la persona no tenía cuenta (422 "tiene que registrarse") y avisaba que un flujo de invitación sería "una spec aparte". Esta es esa spec. La aceptación dentro de la app evita sumar a alguien a un Negocio sin que lo sepa, y da un solo camino para quien ya era Usuario y para quien se acaba de registrar.

## Alternativas descartadas

- **Mail propio (Resend o similar).** Suma un vendor, un dominio verificado y una plantilla. Clerk ya es dueño del registro (ADR 0008).
- **Convertir la Invitación en Empleado al crearse el Usuario.** Sin webhooks (ADR 0009) habría que engancharlo a la creación lazy del Usuario, y sumaría a alguien sin su consentimiento.

## Consecuencias

- Tabla nueva de Invitaciones en el back; migración sin backfill.
- Cambia el contrato de `POST /businesses/:id/employees` (ADR 0007 se actualiza).
- `Employee` no cambia de forma.
- El mail depende de Clerk: si falla, no se crea nada a medias.

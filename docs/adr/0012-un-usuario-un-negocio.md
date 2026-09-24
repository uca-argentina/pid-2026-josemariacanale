# Un Usuario es Dueño de un solo Negocio

El modelo permitía que un Usuario fuera Dueño de varios Negocios (`Business.ownerId` sin restricción, `GET /businesses` como lista). Lo restringimos: un Usuario es Dueño de a lo sumo un Negocio. Quien quiera otro Negocio se registra como otro Usuario con otro email.

Descartamos dos alternativas. Mantener varios Negocios por Dueño obligaba a un selector de Negocio en el panel y a decidir en cada pantalla cuál es el Negocio activo. Hacer cumplir la regla solo en la aplicación dejaba abierta la carrera de dos `POST /businesses` simultáneos.

## Consecuencias

- `Business.ownerId` es único en Postgres; `POST /businesses` responde 409 si el Usuario ya es Dueño de un Negocio. El front oculta la opción de crear otro, pero la garantía es del back.
- `GET /businesses` sigue siendo una lista, ahora de 0 o 1 elementos (no se reabre la forma del ADR 0007).
- No hay borrar ni transferir un Negocio: las equivocaciones se corrigen editando nombre, descripción y Enlace de reserva desde el perfil.
- Si un día un Dueño necesita varios Negocios, hay que quitar la unicidad, agregar el selector y decidir el Negocio activo. Migrar Usuarios duplicados por email a un solo Usuario no es trivial.

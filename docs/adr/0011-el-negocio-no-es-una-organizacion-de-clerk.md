# El Negocio no es una Organization de Clerk: el Empleado no tiene login

Durante un tiempo cada Negocio fue 1:1 con una Organization de Clerk: al Crear Negocio se creaba la Organization con el Dueño como admin, y agregar un Empleado era invitar su email a ella. El Empleado se creaba en Postgres al primer request, con el `org_id` del token. Lo sacamos: el Negocio no sabe nada de Clerk, y el Empleado es un dato (nombre y email dentro de ese Negocio), como dice el glosario. Hoy solo el Dueño inicia sesión.

Las Organizations resolvían el acceso de los Empleados, y hoy ningún Empleado entra a Agendic. A cambio duplicaban datos que ya viven en Postgres (`Business.ownerId`, `Employee`), dejaban una Organization huérfana en Clerk si fallaba el guardado local, y ataban el producto a los límites y precios de Clerk para Organizations y miembros. Vuelve a valer ADR 0008: Clerk es dueño de la identidad, no de los Negocios.

## Consecuencias

- `Business.clerkOrgId` y `Employee.clerkId` se borran. El Empleado se identifica por Negocio y email; una misma persona puede ser Empleado de varios Negocios.
- `POST /businesses/:id/employees` crea el Empleado en el acto (201, 409 si el email ya está en el Negocio). Se van `GET /employees/me` y el guard de Empleado.
- El nombre y el email del Empleado los carga el Dueño; ya no se refrescan desde Clerk. El del Dueño como Empleado se copia una sola vez, al Crear Negocio.
- Si un día los Empleados necesitan iniciar sesión, se decide entonces el mecanismo (Organizations u otro). Revertir esto no es trivial: vuelve la columna, la invitación y la resolución del Empleado por token.

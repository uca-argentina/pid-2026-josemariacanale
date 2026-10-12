# Dos tipos de Ausencia: del Anfitrión y del Invitado

Un Turno puede quedar con una de dos Ausencias, según quién no se presentó: la **Ausencia del Invitado** (no vino el Cliente; antes, "Ausencia" a secas) y la **Ausencia del Anfitrión** (no vino quien lo atiende; antes, "Falta del Empleado"). "Falta del Empleado" deja de usarse: en un Servicio personal no hay Empleado, y nombrar las dos marcas como Ausencia deja claro que son simétricas y se excluyen (ADR 0004).

## Decisiones

- **Solo cambia el vocabulario.** Las reglas de cada marca (quién la pone, cuándo, que se excluyen) siguen como estaban.
- **Los identificadores no cambian**: `Booking.noShowAt` es la Ausencia del Invitado y `Booking.employeeNoShowAt` la del Anfitrión, igual que `PATCH /bookings/:id/no-show`, `PATCH /booking-links/:secret/employee-no-show`, `canMarkEmployeeNoShow` y los KPI `noShows` / `employeeNoShows`. Renombrarlos rompería el contrato de la API y pediría una migración sin cambiar comportamiento.
- **Los mensajes de error del back tampoco** (`Turno already has an Ausencia`, `Turno has an Employee no-show`, …): son contrato (ADR 0007).

## Qué arrastra

- Glosario y ADRs ya usan los términos nuevos; la pantalla de Analíticas también.
- El resto de la app (badges y acciones de Mis turnos, la página del Enlace del Turno, columnas del CSV de Analíticas, TSDoc y comentarios de front y back) se actualiza en #312. Hasta entonces, el CSV sigue con las columnas `Ausencia` y `Falta del Empleado` que lista el ADR 0007.

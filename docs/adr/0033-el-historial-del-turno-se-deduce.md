# El Historial del Turno se deduce de sus campos

El panel lateral de Mis turnos muestra el Historial del Turno: qué le pasó y quién lo hizo. cal.diy lo resuelve con una tabla de auditoría (`getBookingHistory`), con un evento por cambio.

## Decisión

El historial no tiene tabla propia: se arma con lo que el Turno ya guarda.

- Las fechas `createdAt`, `cancelledAt` y `rejectedAt` (#265), `noShowAt`, `employeeNoShowAt` y `depositPaidAt`.
- La cadena de Reagendamientos (`fromRescheduleId`, ADR 0031), que da el horario de antes y el de después.
- Lo que suma este spec: `acceptedAt`, quién Canceló, Rechazó o Reagendó (el Empleado, el Cliente o una baja) y el Motivo de cancelación.

Desmarcar la Ausencia borra `noShowAt`, así que el historial solo muestra la Ausencia vigente. Quien necesite cada marca y cada desmarca tiene que pasar a una tabla de eventos.

## Opciones descartadas

- **Una tabla de eventos por Turno.** Registra todo, incluidas las idas y vueltas de la Ausencia. A cambio, duplica lo que el Turno ya guarda y obliga a escribir en dos lados en cada caso de uso.

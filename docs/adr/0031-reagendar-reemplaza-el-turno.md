# Reagendar reemplaza el Turno

Reagendar ya no mueve el Turno: cancela el original y crea uno nuevo en el horario nuevo, para que el historial (y las analíticas del spec #264) vean cada horario que tuvo un Cliente.

## Decisiones

- **El original queda `CANCELLED`** con `cancelledAt`, `rescheduled = true` (`Booking.rescheduled`, nullable: `true` solo en el original) y sin Enlace. El nuevo apunta a él con `fromRescheduleId` (único).
- **Una sola transacción.** Si falla la creación (por ejemplo, el horario nuevo se ocupó), el original no cambia.
- **El Enlace del Turno pasa al nuevo** (`Booking.link` pasa a nullable, sigue único): el Cliente conserva el mismo link.
- **El nuevo copia** Cliente (una fila `Client` nueva: un Cliente por Turno), `notes`, `employeeChosen`, `price`, `depositAmount` y `depositPaidAt`.
- **Los listados no muestran los originales reagendados**: Mis turnos y los Turnos del Negocio. Los Avisos de cambio del Turno se siguen mandando como antes, con el Enlace del nuevo.

## Qué arrastra

- Reagendar responde otro `id`: el front pasa a usar el de la respuesta.
- Un original reagendado no tiene Enlace, así que no se puede abrir ni Cancelar por ahí.
- **Corrige un punto de la ADR 0022**: el Enlace del Turno ya no se genera solo al crear; Reagendar lo pasa al Turno nuevo.

# El Calendario conectado se lee en vivo y se escribe con un job

El Calendario conectado (ADR 0036) cumple dos funciones con necesidades opuestas. Leerlo (los Ocupados externos) tiene que reflejar lo que el Usuario agendó hace un instante, porque decide qué Horarios reservables se ofrecen. Escribirlo (los Eventos del Turno) no es urgente, y no puede ser parte de la transacción de Reservar: si Google o Microsoft están caídos, el Turno igual tiene que quedar hecho.

## Decisiones

- **Los Ocupados externos se leen en vivo, no se copian.** `ListSlotsUseCase` los pide por cada Usuario que atiende y `computeSlots` los resta como a un Turno tomado, también en las fechas de una Serie y al elegir Empleado al Reservar y al Reagendar. Copiarlos a la base los dejaría desactualizados y obligaría a un job y a webhooks que el proveedor tiene que sostener.
- **Una caché de un minuto por Usuario y rango**, para que abrir la página de reserva no llame al proveedor en cada pedido. Una lectura fallida no se guarda en la caché.
- **La lectura falla abierta.** Si el proveedor no responde se loguea y el Usuario se atiende como si no tuviera ocupados externos. Perder un Horario reservable por una caída ajena es peor que ofrecer uno que choca con un evento personal. Si el proveedor rechaza el token (`CalendarAccessRevokedError`), la conexión pasa a `DISCONNECTED`.
- **Cuenta como ocupado lo que el Usuario tilda.** `CalendarConnection.checkedCalendarIds`, por defecto solo el calendario principal; `[]` no lee ninguno. Se ignoran los eventos transparentes, los cancelados y los propios Eventos del Turno (los reconoce una marca privada, `AGENDIC_EVENT_MARKER`). Un evento de día entero ocupa ese día en la zona del calendario. Sin horarios por ocupados externos, el día es `FULLY_BOOKED`.
- **Los Eventos del Turno los escribe un job, no los casos de uso de Turnos.** `ReconcileBookingCalendarEventsUseCase` corre cada minuto (`@Cron`, sin solaparse) y compara los Turnos vivos de los Usuarios `CONNECTED` con lo que ya escribió (`BookingCalendarEvent`). Crea el evento de un Turno pendiente o aceptado, lo reescribe si cambió y lo borra si el Turno quedó Cancelado o Rechazado. Ningún caso de uso de Turnos llama al proveedor: si este falla, el job reintenta en la próxima vuelta.
- **El `fingerprint` decide si hay que tocar el proveedor.** Es lo último que se escribió: si no cambió, no se llama. Incluye el nombre y el email del Cliente, el Comentario, el Servicio, el Negocio y la Sucursal. Cualquiera de esos cambios reescribe el evento, y recrea el que el Usuario borró a mano. Un evento borrado a mano sin que cambie nada no se recrea.
- **Reagendar pasa la fila al Turno nuevo** si lo atiende el mismo Usuario (ADR 0031), así el evento se mueve en vez de borrarse y crearse.
- **Desconectar borra los futuros antes de revocar el token.** También al Dar de baja. Los eventos pasados quedan. Si el proveedor falla al borrar uno, se loguea y se desconecta igual: bloquear la desconexión sería peor, y las filas se olvidan.
- **Conectar otra cuenta olvida las filas del Usuario**, sea de otro proveedor o de otro email del mismo. Antes se intentan borrar los eventos futuros con el token anterior; si no se puede, se dejan. Con las filas olvidadas, el job escribe los Turnos vivos en el calendario nuevo.
- **El Cliente figura como invitado en Google (`sendUpdates=none`) y en la descripción en Microsoft**, porque Graph no permite invitados sin que Microsoft les mande la invitación.

## Consecuencias

- Un Turno tarda hasta un minuto en aparecer en el calendario del Usuario.
- El job lee cada minuto todos los Turnos vivos de los Usuarios conectados. `syncedAt` se guarda y todavía no se usa para acotar la consulta: si el volumen crece, acotar por rango o por `syncedAt`.
- Si `createEvent` anda y guardar la fila falla, el reintento crea un evento duplicado. Se acepta: la alternativa, un id determinístico elegido por Agendic, falla con 409 si el Usuario borró ese evento, porque un id borrado no se puede reusar.
- La lectura en vivo hace que cada pedido de Horarios reservables dependa de la latencia del proveedor, acotada por la caché y por el fallo abierto.

# La Serie son Turnos sueltos con un mismo Empleado

Un Cliente puede Reservar varias veces el mismo Turno, el mismo día de la semana a la misma hora: una Serie. Se copia de las series recurrentes de cal.diy (`recurringEventId`), con recortes.

## Decisión

- **La Serie es una marca en cada Turno, no una entidad con vida propia.** Cada Turno de la Serie es un Turno completo, con su Enlace del Turno, su Seña, su Ausencia, su Falta del Empleado y su Calificación. Lo que los une es un identificador de Serie compartido, igual que `recurringEventId` en cal.diy. Así, todo lo que ya funciona sobre un Turno (Reagendar, Cancelar, analíticas, la ADR 0031) sigue andando sin casos especiales.
- **La arma solo el Cliente, al Reservar**, en un Servicio con Repetición: cada N semanas y con un máximo de Turnos. La única frecuencia es la semanal. Una Serie tiene como máximo **10 Turnos**, sea cual sea la frecuencia: es un tope fijo de Agendic, y el máximo de la Repetición no puede pasarlo (el back responde 400). El tope cuenta Turnos y no semanas, porque lo que se quiere limitar es cuánto se compromete la agenda de una sola vez.
- **Choques visibles.** Si alguna fecha no tiene Horario reservable (por un Turno tomado, Fuera de la oficina, un Día festivo, el Límite diario o la falta de una Cabina libre), se le muestran al Cliente y decide si sigue sin ellas. Nunca se saltean sin avisar, y una fecha mala no tira abajo toda la Serie.
- **Un mismo Empleado para toda la Serie.** Con "cualquiera" se elige al Empleado libre en más fechas y, si empatan, al que hace más tiempo que no recibe un Turno. La Cabina, en cambio, se asigna Turno por Turno, porque el Cliente no la ve.
- **La Cabina se repite cuando puede.** Para cada fecha se usa la Cabina del Turno anterior de la Serie si está libre; si no, se aplica la regla de la ADR 0030. Así el mismo Cliente usa siempre el mismo box, igual que cuando Reagendar conserva la Cabina.
- **Se confirma todo o nada.** Si al confirmar la Serie salta la constraint del Empleado o de la Cabina en alguna fecha, el back primero prueba con otra Cabina libre. Si no queda ninguna, deshace toda la Serie y responde 409 con las fechas que chocaron. El Cliente puede seguir sin esas fechas sin pedir otro Código de verificación.
- **Dar de baja una Cabina** sigue como en la ADR 0030: 409 mientras tenga Turnos futuros, también los de una Serie.
- **Lo que se hace de una vez:** un Código de verificación, una Confirmación de reserva con todas las fechas, y Aceptar o Rechazar la Serie entera. Cancelar se hace sobre un Turno o sobre ese y los siguientes. Reagendar se hace solo sobre un Turno, y el Turno nuevo hereda la Serie.
- **Cuentas:** cada Turno cuenta como un Reservado en las analíticas y usa una sesión de un Paquete. Cuando no quedan sesiones, los Turnos que sobran piden Seña.

## Opciones descartadas

- **Una tabla de Series con reglas propias** (estilo RRULE). Permite editar la Serie, pero obliga a materializar o recalcular los Turnos y duplica la lógica de disponibilidad.
- **Todo o nada al Reservar.** Un feriado rompía toda la Serie.
- **Asignar un Empleado por Turno.** Quien reserva "todos los martes" espera a la misma persona.
- **Frecuencia diaria o mensual**, como en cal.diy. El mes, en zona horaria local, complica las fechas sin que nadie lo haya pedido.

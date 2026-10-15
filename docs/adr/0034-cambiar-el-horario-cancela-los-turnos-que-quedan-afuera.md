# Cambiar el horario cancela los Turnos que quedan afuera

Cuando quien atiende un Turno (el Empleado, o el Usuario en un Servicio personal) cambia su horario de modo que el Turno ya no cabe, Agendic Cancela ese Turno, previa confirmación del Usuario y con una Causa de cancelación. Reemplaza en parte al ADR 0027, que dejaba esos Turnos en pie y pedía Cancelarlos a mano.

## Decisiones

- **Disparadores.** Crear o editar un período Fuera de la oficina; guardar una Availability (Franjas, zona horaria y Anulaciones se guardan juntas); elegir el país de los Días festivos; prender un Día festivo.
- **Qué queda afuera.** Los Turnos pendientes o aceptados del Usuario que todavía no empezaron, en todos sus Negocios y en sus Servicios personales. Un cambio de Availability solo toca los Turnos que se atienden con esa Availability; Fuera de la oficina y los Días festivos tocan todos.
- **Antes contra después.** Un Turno se cancela si estaba dentro del horario antes del cambio y queda afuera después. Los que ya estaban afuera no se tocan. Achicar o borrar un período, o apagar un Día festivo, no descancela nada.
- **"Dentro" es la regla de los Horarios reservables.** El tramo desde el inicio del Tiempo de preparación hasta el fin cabe en una sola Franja de la fecha local, leída en la zona de la Availability con la que se atiende (o en la Anulación de esa fecha, que reemplaza las Franjas), y esa fecha no cae en un período Fuera de la oficina ni en un Día festivo prendido. Un Turno que cruza dos Franjas pegadas queda afuera. Una Availability desconocida deja el Turno afuera. El módulo que lo calcula es puro y lineal, y comparte con el cálculo de Horarios reservables la lectura indexada de Franjas y Anulaciones.
- **Se confirma con una vista previa.** Cada escritura tiene una vista previa que devuelve los Turnos que quedarían afuera. La escritura recibe `cancelBookingIds` con los que el Usuario confirmó; si alguno de los que quedan afuera no está en la lista, responde 409 sin escribir nada y el front vuelve a pedir la vista previa.
- **El Motivo de cancelación lo escribe Agendic.** Es una foto del texto que vio el Cliente al cancelar, y no cambia aunque el período se borre o su nota se edite. El Turno queda con `cancelledBy = EMPLOYEE` y la Causa (Fuera de la oficina, Día festivo o Cambio de horario).

## Riesgos asumidos

- **Carrera.** Entre calcular los Turnos que quedan afuera y el commit hay una ventana de milisegundos, el mismo costo que Reservar con horarios viejos. Los minutos que el diálogo está abierto los cubre el 409.
- **Cambios masivos.** Cambiar la zona horaria de una Availability o el país de los Días festivos puede afectar muchos Turnos; el diálogo los lista todos.
- **Caída de Google.** Al guardar un período o una Availability, los Días festivos se leen en modo tolerante: mientras Google esté caído, un Turno que cae en un Día festivo podría cancelarse por otro cambio.
- **Transacción.** La cancelación agrupa los Turnos por texto en pocas escrituras para no pasar el tiempo límite de la transacción.

## Qué queda afuera

Pasar los Turnos a otro Empleado en vez de cancelarlos (#216), elegir cuáles cancelar, descancelar al achicar o borrar, y cancelar cuando el caché de Google suma un Día festivo nuevo.

# Consignas de parcial — Agendic

## Consigna original: Lista de espera para turnos ocupados (back)

**Feature**

- Se puede crear una lista de espera para un turno que ya está tomado.
- Cuando se libera un turno, se crea una **oferta** para la primera persona elegible de la lista, respetando el orden.
- La oferta vence a los **15 minutos**.
- Mientras la oferta está vigente, el horario queda reservado temporalmente para esa persona. Si acepta a tiempo, se le asigna el turno.
- Si la oferta vence, pasa a la siguiente persona elegible. Si la lista se agota, el turno vuelve a publicarse como disponible.

**Alcance**

- El vencimiento se procesa al consultar una oferta o al intentar aceptarla. No hace falta una tarea programada.
- No hace falta enviar correos reales.

**Caso de validación**

> Intentar aceptar una oferta vencida. La aceptación debe rechazarse, y el turno debe ofrecerse a la siguiente persona de la lista o volver a quedar disponible si no quedan personas elegibles.

### 1. Paquetes de sesiones

**Feature**

- El negocio puede vender un **paquete** de N sesiones de un servicio, con fecha de vencimiento.
- Al reservar, el cliente puede usar un paquete vigente. La reserva descuenta una sesión.
- Si cancela dentro de la política del establecimiento, se le devuelve la sesión. Si cancela fuera de la política o no se presenta, la sesión se pierde.
- Un paquete solo sirve para el servicio con el que se vendió.

**Alcance**

- El pago del paquete es simulado.
- El vencimiento se evalúa al momento de reservar. No hace falta un proceso programado.

**Caso de validación**

> Intentar reservar con un paquete que tiene 0 sesiones restantes o que está vencido. Debe rechazarse con un error que diga el motivo. Después, cancelar a tiempo una reserva hecha con paquete y verificar que el contador de sesiones vuelve a subir.

### 2. Ausencia de un profesional con turnos ya tomados

**Feature**

- Un profesional puede cargar una ausencia que se superpone con turnos ya confirmados.
- La ausencia se registra igual, y los turnos afectados pasan a estado **requiere reprogramación**.
- Para cada turno afectado, el sistema genera una **propuesta**: el primer horario libre para el mismo servicio, con el mismo profesional o con otro que lo realice.
- El cliente puede aceptar la propuesta o cancelar. Si cancela, se le devuelve la seña completa, sin importar la política.

**Alcance**

- No hace falta enviar notificaciones reales.

**Caso de validación**

> Aceptar una propuesta cuyo horario fue tomado por otra reserva mientras tanto. La aceptación debe rechazarse y debe generarse una nueva propuesta con el siguiente horario libre.

### 3. Penalización por no presentarse

**Feature**

- Si un cliente acumula **2 o más turnos en estado "no presentado" en los últimos 60 días**, sus nuevas reservas exigen una seña del 100%, sin importar el porcentaje configurado.
- El administrador puede perdonar un "no presentado". En ese caso deja de contar para la penalización.
- El porcentaje de penalización y la ventana de días son configurables por establecimiento.

**Alcance**

- El cálculo se hace al momento de reservar. No hace falta guardar el estado de penalización.

**Caso de validación**

> Un cliente con 2 "no presentados" reserva y se le exige el 100% de seña. El admin perdona uno, el cliente vuelve a reservar y se le aplica el porcentaje normal.

### 4. Reserva temporal durante la confirmación

**Feature**

- Cuando un cliente elige un horario, se crea una **retención** de 10 minutos. Mientras está vigente, ese horario no aparece disponible para otros clientes.
- Si el cliente confirma dentro del plazo, la retención se convierte en reserva en estado "pendiente de seña".
- Un cliente no puede tener más de una retención activa a la vez. Si crea otra, la anterior se libera.

**Alcance**

- El vencimiento se procesa al consultar disponibilidad o al intentar confirmar. No hace falta una tarea programada.

**Caso de validación**

> Dos clientes intentan el mismo horario. El segundo no lo ve disponible mientras dura la retención. Si el primero confirma después de los 10 minutos, se rechaza y el horario vuelve a estar disponible.

> **Grupo 4 · Reclamos de un Turno atendido**
>
> 1. El Cliente, desde el Enlace del Turno, puede hacer un **Reclamo** sobre ese Turno escribiendo el motivo. Cada Turno tiene como mucho un Reclamo.
> 2. El Cliente puede ver el estado de su Reclamo (abierto o resuelto) y, si ya la tiene, la respuesta del Negocio.
> 3. El Dueño ve la lista de Reclamos **abiertos** y responde cada uno. Al responderlo, queda resuelto.
> 4. **Validación:** no se puede reclamar un Turno que todavía no fue atendido (futuro o cancelado) → error, y no se guarda nada.

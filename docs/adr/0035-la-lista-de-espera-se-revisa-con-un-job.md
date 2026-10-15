# La Lista de espera se revisa con un job, y avisa a todos a la vez

Un Horario reservable puede aparecer por muchas causas: un Turno que se Cancela, se Rechaza o se Reagenda, una baja, una Franja nueva, una Anulación que se borra, un período Fuera de la oficina que se achica, un Día festivo que se apaga, un Límite diario más alto, un Empleado que empieza a Ofrecer el Servicio, una Cabina nueva, un Intervalo distinto… Enganchar el Aviso de horario libre en cada uno de esos casos de uso es fácil de olvidar en el próximo que se sume, y ensucia casos de uso que no tienen nada que ver con la Lista de espera.

En cambio, un job periódico (como el de la Invitación a calificar) recalcula cada pocos minutos los Horarios reservables de cada Servicio y fecha que tengan anotados, con el mismo cálculo que ve el Cliente al Reservar, y avisa si el día pasó de lleno a tener lugar. Así cubre cualquier causa, presente o futura, sin tocar los demás casos de uso.

## Decisiones

- **Job, no eventos.** El precio es una demora de hasta un ciclo del job entre que se libera el horario y llega el Aviso, y que un horario que se libera y se vuelve a tomar dentro del mismo ciclo no avise a nadie.
- **Se avisa en la transición de lleno a con lugar.** Cada anotación recuerda si ya fue avisada; el job la rearma cuando vuelve a encontrar el día lleno. Mientras el día siga con lugar, no se repite el Aviso.
- **A todos a la vez, gana el primero que Reserva.** No hay orden de llegada ni horario retenido para un anotado: un horario retenido sin Turno no lo protege ninguna constraint (ADR 0004) y sería un estado nuevo de "reserva tentativa". Reservar desde el Aviso es un Reservar común, con su Código de verificación (ADR 0022).

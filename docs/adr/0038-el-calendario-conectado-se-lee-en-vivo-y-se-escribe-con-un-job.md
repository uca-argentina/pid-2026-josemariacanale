# El Calendario conectado se lee en vivo y se escribe con un job

La sincronización con el Calendario conectado (ADR 0036) va en los dos sentidos, y cada sentido se resuelve distinto.

**Leer: en vivo.** Cada cálculo de Horarios reservables le pide al proveedor los ocupados de los Usuarios involucrados, con una caché corta (alrededor de un minuto por Usuario y rango). El cálculo se vuelve a hacer al ingresar el Código de verificación y al Reagendar: un Ocupado externo que apareció en el medio es un 409, igual que un horario tomado. Copiar los ocupados a Postgres con un job habría hecho rápido a `computeSlots` y lo habría independizado del proveedor. Lo descartamos porque, durante un ciclo de demora, el Cliente puede Reservar encima de una reunión recién cargada, que es justo lo que la sincronización viene a evitar.

**Escribir: con un job.** Un job reconcilia cada minuto los Turnos cuyo estado cambió desde su última sincronización, y crea, actualiza o borra su Evento del Turno. Es por la misma razón que la ADR 0035: un Turno cambia por muchos caminos (Reservar, Aceptar, Rechazar, Reagendar, Cancelar, una Serie, una baja, las cancelaciones de la ADR 0034), y engancharse en cada caso de uso es fácil de olvidar en el próximo que se sume. Además, el job reintenta solo.

## Consecuencias

- **Fail-open.** Si el proveedor no responde, los Horarios reservables se calculan sin ese Calendario conectado y se loguea el error. Si el proveedor invalida el token, la conexión queda desconectada y el Usuario ve un aviso en el panel.
- **Un Ocupado externo nunca Cancela.** Agendic no se entera en el momento de lo que pasa en el calendario externo. A diferencia de la ADR 0034, solo resta Horarios reservables.
- Los Eventos del Turno que escribió Agendic no cuentan como Ocupado externo, para que un Turno no se bloquee a sí mismo.
- Un Servicio del Negocio con muchos Empleados hace una consulta externa por cada uno. El job de la Lista de espera (ADR 0035) también, en cada vuelta.
- El Evento del Turno puede tardar hasta un ciclo del job en aparecer, cambiar o borrarse.

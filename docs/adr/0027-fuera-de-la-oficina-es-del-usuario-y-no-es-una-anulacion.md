# Fuera de la oficina es del Usuario y no es una Anulación

> Reemplazado en parte por el [ADR 0034](0034-cambiar-el-horario-cancela-los-turnos-que-quedan-afuera.md): el período ya no deja en pie los Turnos que cubre, los Cancela previa confirmación.

Fuera de la oficina (copiado de cal.diy, `OutOfOfficeEntry`) es un concepto propio, guardado aparte de las Anulaciones y colgado del Usuario, no de una Availability ni de un Empleado. El cálculo de Horarios reservables lo descuenta además de las Anulaciones.

Motivos:

- **No se generan Anulaciones.** Un período de dos semanas serían catorce Anulaciones de día libre por cada Availability del Usuario. Se pierden el motivo y la nota pública, y borrar el período obliga a adivinar cuáles Anulaciones eran suyas y cuáles cargó el Usuario a mano.
- **Del Usuario.** Un Turno ya ocupa al Usuario en todos sus Servicios, personales o de cualquier Negocio. Quien se va de vacaciones no atiende en ninguno, así que el período bloquea todas sus Availabilities juntas. cal.diy hace lo mismo (`userId`).
- ~~**No toca los Turnos ya tomados.**~~ Reemplazado por el ADR 0034. Como en cal.diy, el período dejaba de ofrecer Horarios reservables nuevos y el Empleado Cancelaba o Reagendaba a mano los que ya tenía.

## Qué queda afuera

Redirigir a otro Usuario (#216), los webhooks (#217), el aviso en la página de la Sucursal (#227) y que el Dueño gestione los períodos de sus Empleados (#228).

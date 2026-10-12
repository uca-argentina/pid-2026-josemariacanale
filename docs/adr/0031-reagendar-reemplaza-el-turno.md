# Reagendar reemplaza el Turno

Hasta ahora, Reagendar movía el mismo Turno a otro horario y no quedaba rastro del cambio. Las analíticas necesitan contar los Reagendamientos por la fecha en que pasaron, sin que se mezclen con las Cancelaciones. Por eso Reagendar pasa a funcionar como en cal.diy:

- El Turno original queda Cancelado (`cancelledAt`), con la marca de reagendado.
- Se crea un Turno nuevo en el horario nuevo, que apunta al original.

## El Enlace del Turno pasa al Turno nuevo

El secreto del Enlace del Turno se mueve del original al nuevo, así que el Cliente sigue usando el mismo link y la ADR 0022 sigue valiendo: el Enlace abre un solo Turno, el vigente. El original queda sin Enlace, porque nadie vuelve a él.

## Qué se copia

El Turno nuevo hereda del original:

- el Cliente;
- el Comentario del Turno;
- el Empleado elegido;
- el precio fijado al Reservar;
- la Seña y su pago.

El estado del Turno nuevo sigue la regla de siempre: con Aprobación manual, si Reagenda el Cliente, vuelve a quedar pendiente.

## Cómo se cuenta

- **Reagendados**: los Turnos originales con la marca de reagendado, por `cancelledAt`.
- **Cancelados**: los Turnos Cancelados cuya marca de reagendado no es verdadera. Se filtra con `IS NOT TRUE`, no con `IS NULL`.
- **Reservados**: no incluye el Turno nuevo de un Reagendamiento, porque el Cliente no volvió a Reservar.

En Mis turnos, el original no aparece y el Turno nuevo lleva un badge "Reagendado".

## Opciones descartadas

- **Seguir moviendo el mismo Turno y llevar una tabla aparte de Reagendamientos.** Mantenía un Turno por reserva, pero agregaba una tabla que solo leen las analíticas.
- **Darle un Enlace nuevo al Turno nuevo.** Rompía los links que el Cliente ya tenía en sus mails.

No se suma el "pedido de reprogramación" del Empleado que tiene cal.diy.

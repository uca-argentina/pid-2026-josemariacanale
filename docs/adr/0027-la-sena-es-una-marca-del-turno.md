# La Seña es una marca del Turno

La Seña de un Turno se guarda en dos campos del propio Turno: `depositAmount`, el monto, que se fija al Reservar, y `depositPaidAt`, cuándo la pagó el Cliente (`null` mientras no). Seña pendiente = `depositAmount !== null && depositPaidAt === null`.

## Decisiones

- **Es un campo aparte, no un `BookingStatus`.** Pagar la Seña es independiente de que el Turno esté pendiente o aceptado: un Turno pendiente puede tenerla pagada, y uno aceptado puede no tenerla. Un estado nuevo multiplicaría los estados (pendiente con Seña, aceptado con Seña…) y cada transición (Aceptar, Rechazar, Reagendar) tendría que acordarse de él. Es la misma razón por la que la Ausencia es `noShowAt` y no un estado.
- **El monto se fija al Reservar.** `price × depositPercent / 100`, redondeado al centavo. Cambiar después el precio o la Seña del Servicio no toca los Turnos ya reservados: el Cliente paga lo que le dijeron al Reservar.
- **La paga solo el Cliente, por el Enlace del Turno.** `PATCH /booking-links/:secret/deposit`, sin Sesión, hasta que el Turno empieza. Es simulado: Agendic no cobra. La escritura va con guarda (pendiente o aceptado, sin empezar, con Seña y sin pagar), como la Ausencia, para que una carrera no la pise.

## Qué arrastra

- Reagendar, por las dos vías, la deja pagada, también si el Turno vuelve a quedar pendiente por Aprobación manual.
- Cancelar y Rechazar no la tocan: la Seña pagada queda registrada y no se devuelve.
- No manda mail.

## Descartado

- **Un estado nuevo** (`DEPOSIT_PENDING` o similar), por lo de arriba.
- **Calcular el monto en vivo** desde el Servicio: un cambio de precio movería la Seña de Turnos ya reservados.
- **Que el Empleado registre el pago**: Agendic no cobra, y quien sabe que «pagó» es el Cliente. Si no la paga, el Empleado puede Cancelar o Rechazar a mano.

## Pendiente

La excepción del Paquete (un Turno que usa una sesión de un Paquete no pide Seña) queda para cuando exista Paquete.

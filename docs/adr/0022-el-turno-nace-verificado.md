# El Turno nace con el email verificado; el Cliente entra a su Turno por el Enlace del Turno

Reemplaza al ADR 0005 en cuándo se verifica el Turno y al ADR 0006 en que el Turno se verificaba con un link.

**Actualización**: Mis turnos del Cliente ya no existe. Quedó una sola credencial, el Enlace del Turno; los detalles están abajo, en «Acceso al Enlace del Turno».

Antes, `POST /bookings` creaba un Turno `UNVERIFIED` y mandaba un link con un token de 256 bits; el Turno pasaba a `BOOKED` (o `PENDING`) al abrirlo. Ahora no existe el Turno sin verificar. El Cliente pide un Código de verificación para su email, lo ingresa en la misma pantalla de Reservar, y el pedido de reserva viaja con el código: el back lo valida y recién ahí crea el Turno, ya `BOOKED` o `PENDING`. Es el flujo de cal.diy (`RegularBookingService`).

Motivos:

- El Turno sin verificar no retenía su horario (ADR 0005) para que nadie bloqueara la agenda con emails falsos. Si el Turno ni siquiera existe hasta verificar, la protección es la misma y desaparecen un estado, la carrera entre dos verificaciones del mismo horario y los campos de token en `Booking`.
- El ADR 0006 dejaba al Turno con link porque el Cliente "no tiene pantalla donde tipear un código". Ahora la tiene: la de Reservar.

## El código

TOTP sin estado, atado al email, con ventana de 15 minutos y rate limit por email, como el de cal (`verifyCodeUnAuthenticated`). No se guarda nada por código pedido. Mismo alfabeto y el mismo razonamiento que el ADR 0006 para no contar intentos fallidos.

## El Cliente es una fila por Turno

El Cliente (nombre y email) pasa a su propia tabla, una fila por Turno, con índice no único sobre el email, como el `Attendee` de cal. El mismo email en tres Turnos son tres filas; cada una guarda el nombre con el que se reservó, que es el que ve el Negocio. Se descartó un Cliente único por email: obligaba a elegir qué nombre gana entre reservas, y no había nada más que guardar de él. Tampoco se autocompleta el nombre: sin cuenta, devolver el nombre a quien tipea un email ajeno lo filtra.

## Acceso al Enlace del Turno

Una sola credencial, sin cookie ni Sesión: cada Turno tiene un identificador secreto único (`uid` en cal) que va en los links de la Confirmación de reserva. Abre ese Turno solo, sin código, y permite Cancelarlo o Reagendarlo. Prueba que se tiene el Turno, no quién es: si el mail se reenvía, quien lo reciba puede gestionarlo. Se aceptó igual que en cal porque el alcance es un Turno, no todos los del email. La página es `noindex`, y `POST /bookings` devuelve el `link` para llevar al Cliente ahí apenas Reserva.

Antes había una segunda credencial, un token firmado de 15 minutos que se cambiaba por un Código de verificación (`POST /client-access`) y abría Mis turnos del Cliente, la lista de todos los Turnos de un email. Se sacó: el Cliente terminaba en una lista en vez de en el Turno que acababa de reservar, y la pantalla no justificaba un endpoint, un guard y un esquema de token propios. Lo que se pierde es que un Cliente que borró la Confirmación de reserva ya no puede volver a su Turno; se acepta y se rehace si hace falta.

## Consecuencias

- `BookingStatus.UNVERIFIED`, los campos de token de `Booking` y `POST /bookings/verification` desaparecen; `POST /bookings` pide el código. El ADR 0007 se actualiza con el contrato nuevo.
- Cancelar y Reagendar dejan de ser solo del Empleado: el Cliente puede hacerlo sobre Turnos `PENDING` y `BOOKED`. Cancelar, hasta que el Turno empieza. Reagendar, mismo Servicio y Empleado; si el Servicio tiene Aprobación manual, el Turno vuelve a `PENDING`.
- Los Turnos existentes `UNVERIFIED` se descartan en la migración: nunca retuvieron su horario.

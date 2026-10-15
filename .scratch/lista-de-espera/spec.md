## Problem Statement

Cuando un Cliente entra a Reservar un Servicio y el día que quiere ya tiene todos sus Horarios reservables tomados, hoy no puede hacer nada más que probar otro día o volver a entrar cada tanto a ver si se liberó algo. Si un Turno se Cancela, se Rechaza o se Reagenda, ese horario vuelve a estar libre, pero nadie se entera: el Negocio pierde el Turno y el Cliente que lo quería no lo consigue.

## Solution

En un día lleno, la página de reserva ofrece **anotarse en la Lista de espera** de ese Servicio para esa fecha, con nombre y email y Verificando email con el Código de verificación de siempre. El Cliente recibe una **Confirmación de anotación** por mail.

Cuando en ese día vuelve a aparecer un Horario reservable, por la razón que sea, todos los anotados reciben a la vez un **Aviso de horario libre**: un mail con el Servicio y la fecha, que lleva a la página de reserva con ese día ya elegido y el formulario precargado. El horario queda para el primero que Reserva. Si el día se vuelve a llenar y después se libera otro horario, llega otro Aviso.

La Confirmación de anotación y cada Aviso traen un enlace para **Salir de la Lista de espera**. La Anotación también termina sola cuando pasa la fecha o cuando el Servicio se Da de baja. Mientras el Cliente tenga un Turno de ese Servicio en esa fecha, no recibe Avisos.

Glosario: Lista de espera, Anotación, Confirmación de anotación, Aviso de horario libre, Salir de la Lista de espera (`CONTEXT.md`). Decisión del job: ADR 0034.

## User Stories

1. Como Cliente, quiero que en un día sin lugar la página de reserva me ofrezca anotarme en la Lista de espera, para no tener que volver a entrar a cada rato.
2. Como Cliente, quiero que no se me ofrezca anotarme en un día en que nadie trabaja, para no esperar algo que no va a pasar.
3. Como Cliente, quiero que no se me ofrezca anotarme en un día en que quien atiende un Servicio personal está Fuera de la oficina o es un Día festivo, por la misma razón.
4. Como Cliente que entró por el Enlace de reserva de un Empleado, quiero que si ese Empleado no tiene lugar pero otro sí, se me sugiera reservar con "cualquiera" en vez de anotarme, porque hay lugar.
5. Como Cliente que entró por el Enlace de reserva de un Empleado, quiero poder anotarme si el Servicio entero está lleno ese día, sabiendo que el Aviso no es de ese Empleado en particular.
6. Como Cliente, quiero anotarme con nombre y email, como al Reservar, para que el Aviso me salude y el formulario me venga precargado.
7. Como Cliente, quiero Verificar email con las mismas seis casillas que al Reservar, para no aprender otro flujo.
8. Como Cliente, quiero que si el código es inválido o venció se me diga, para pedir otro.
9. Como Cliente, quiero ver una pantalla que me confirme que quedé anotado, con el Servicio y la fecha.
10. Como Cliente, quiero recibir una Confirmación de anotación por mail, con el Servicio, la fecha y el enlace para Salir de la Lista de espera, para poder arrepentirme antes del primer Aviso.
11. Como Cliente, quiero que si me anoto dos veces al mismo Servicio y fecha no quede anotado dos veces ni me lleguen dos Confirmaciones.
12. Como Cliente, quiero poder anotarme a varias fechas y a varios Servicios, una Anotación por cada uno.
13. Como Cliente, quiero que si mientras me anotaba se liberó un horario, se me diga que ya hay lugar y pueda Reservar directamente.
14. Como Cliente, quiero que no se me deje anotar a una fecha que ya pasó.
15. Como Cliente, quiero recibir un Aviso de horario libre cuando se libera un horario en la fecha a la que me anoté, para Reservarlo antes que otro.
16. Como Cliente, quiero que el Aviso me llegue sea cual sea la razón por la que apareció el horario (una cancelación, un rechazo, un Reagendamiento, una baja, una Franja nueva, un Límite diario más alto, un Empleado nuevo…).
17. Como Cliente, quiero que el Aviso diga el Servicio y la fecha pero no prometa un horario concreto, porque para cuando lo leo puede estar tomado.
18. Como Cliente, quiero que el enlace del Aviso me lleve a la página de reserva del Servicio con esa fecha ya elegida y mi nombre y email precargados, para Reservar en segundos.
19. Como Cliente, quiero que Reservar desde el Aviso sea un Reservar común, con su Código de verificación, y que gane el primero que Reserva.
20. Como Cliente, quiero no recibir el mismo Aviso varias veces mientras el día siga con lugar.
21. Como Cliente, quiero recibir otro Aviso si el día se volvió a llenar y después se liberó otro horario, porque la primera vez llegué tarde.
22. Como Cliente, quiero dejar de recibir Avisos para esa fecha cuando ya tengo un Turno de ese Servicio ese día.
23. Como Cliente, quiero volver a recibirlos si Cancelo ese Turno, porque sigo queriendo ese día.
24. Como Cliente, quiero que mi Anotación termine sola cuando pasa la fecha.
25. Como Cliente, quiero que mi Anotación termine si el Servicio se Da de baja, para no esperar algo que ya no existe.
26. Como Cliente, quiero que si el Servicio se oculta mi Anotación siga, porque el Servicio se sigue pudiendo Reservar por su enlace.
27. Como Cliente, quiero un enlace para Salir de la Lista de espera en cada Aviso, para cortar los mails cuando ya no me interesa.
28. Como Cliente, quiero que Salir me pida confirmar con un botón y no pase solo por abrir el enlace, porque los antivirus del mail abren los links.
29. Como Cliente, quiero que Salir no me pida Verificar email de nuevo, porque el enlace ya prueba que el mail es mío.
30. Como Cliente, quiero ver que ya salí si vuelvo a abrir el enlace después de Salir.
31. Como Cliente, quiero poder volver a anotarme a la misma fecha después de haber salido.
32. Como Cliente de un Servicio personal, quiero la misma Lista de espera que en un Servicio del Negocio.
33. Como Dueño, quiero que la Lista de espera no me pida configurar ni gestionar nada, para que funcione sola.
34. Como Empleado, quiero que la Lista de espera no cambie cómo se Reservan, Cancelan o Reagendan los Turnos, para que nada de mi día a día se rompa.

## Implementation Decisions

- **Glosario y ADR.** Términos en `CONTEXT.md`: Lista de espera, Anotación, Confirmación de anotación, Aviso de horario libre, Salir de la Lista de espera; `lista-de-espera` se suma a las palabras reservadas del Enlace de reserva. Detección por job y aviso a todos a la vez: ADR 0034. La 0026 y la 0007 se actualizan con los tickets que tocan su contrato.
- **Día lleno.** Es el que `GET /services/:id/slots` (sin `employeeId`) devuelve con `reason: FULLY_BOOKED`, en la zona del Servicio (la de la Sucursal, o la de la Availability en un Servicio personal). `NOT_WORKING` y `OUT_OF_OFFICE` no son llenos.
- **Modelo `WaitlistEntry`** (Anotación): `serviceId`, `date` (fecha sin hora, en la zona del Servicio), `clientName`, `email` (recortado y en minúsculas, como el del Código de verificación), `link` (secreto único, como el Enlace del Turno), `notifiedAt` (nulo mientras no se avisó desde la última vez que el día estuvo lleno), `leftAt` (nulo mientras no Salió), `createdAt`. Unique parcial sobre `(lower(email), serviceId, date)` entre las que tienen `leftAt` nulo, en el SQL de la migración (ADR 0004).
- **Anotación viva.** `leftAt` nulo, fecha de hoy en adelante en la zona del Servicio, y Servicio sin Dar de baja. Pasar la fecha o la baja del Servicio no escriben nada: la Anotación simplemente deja de considerarse.
- **Anotarse**: `POST /services/:id/waitlist`, sin Sesión. Body `{ date: "YYYY-MM-DD", clientName, clientEmail, code }`. El código se pide con el `POST /bookings/code` de siempre y se valida con el mismo `BookingVerificationCodes`.
  - 201 `{ serviceId, date }` y Confirmación de anotación si es nueva; 200 con el mismo body, sin mail, si ya había una viva para ese email, Servicio y fecha.
  - 400 si falta un campo o la fecha no es `YYYY-MM-DD`; 400 `Invalid or expired verification code for <email>`.
  - 404 `Service not found or retired`.
  - 422 `Date <date> is in the past` si es anterior a hoy en la zona del Servicio.
  - 409 `Date <date> is not fully booked for Service <id>` si el día no es `FULLY_BOOKED`.
  - Si el mail de Confirmación de anotación falla, se loguea y la Anotación queda creada.
- **Leer la Anotación**: `GET /waitlist-links/:secret`, sin Sesión. 200 `{ date, timeZone, left: boolean, service: { name, slug }, business: { name, slug } | null, branch: { name, slug } | null, user: { slug } | null }`, con la misma convención que `ClientBooking`: `business` y `branch` nulos en un Servicio personal, `user` nulo en uno del Negocio. 404 `Anotación not found`.
- **Salir de la Lista de espera**: `POST /waitlist-links/:secret/leave`, sin Sesión, sin body. 204; también 204 si ya había salido. 404 `Anotación not found`.
- **Palabra reservada.** `lista-de-espera` entra en `RESERVED_SLUGS`. La migración falla con un mensaje claro si algún Negocio o Usuario ya tiene ese primer tramo.
- **Mails** (en castellano), dos métodos nuevos del `Mailer`:
  - Confirmación de anotación: nombre, Servicio, fecha y el enlace `<FRONTEND_URL>/lista-de-espera/<secreto>`.
  - Aviso de horario libre: nombre, Servicio, fecha, el enlace a la página de reserva y el de Salir.
- **Enlace del Aviso.** `<FRONTEND_URL>/<negocio>/<sucursal>/<servicio>?fecha=YYYY-MM-DD&nombre=<nombre>&email=<email>`, o `<FRONTEND_URL>/<usuario>/<servicio>?…` en un Servicio personal, con los valores codificados para URL. El front lo lee para elegir el día y precargar el formulario.
- **Job** (ADR 0034). Un `@Cron` cada 5 minutos, como el de la Invitación a calificar, corre un use case que:
  1. toma las Anotaciones vivas, agrupadas por Servicio;
  2. calcula los días de cada Servicio con `ListSlotsUseCase` sin `employeeId`, en tramos de hasta 31 días entre la primera y la última fecha con Anotaciones;
  3. para cada Anotación, si su día tiene horarios, `notifiedAt` es nulo y el email no tiene un Turno vivo de ese Servicio en esa fecha, manda el Aviso y guarda `notifiedAt`, solo si el mail salió bien;
  4. si su día no tiene horarios, por la razón que sea, vuelve `notifiedAt` a nulo (la rearma).
- **Turno vivo del email.** Un Turno `PENDING` o `BOOKED` de ese Servicio, de un Cliente con ese email (sin mayúsculas), cuyo inicio cae en esa fecha en la zona del Servicio. Se calcula en cada vuelta del job, sin guardar nada: si lo Cancela, la Anotación vuelve a recibir Avisos sola.
- **Front, anotarse.** En la página de reserva, un día `FULLY_BOOKED` muestra "Anotarme en la Lista de espera" en vez de horarios. Con Empleado elegido, si su día es `FULLY_BOOKED`, el front consulta el mismo día sin `employeeId`: si el Servicio tiene lugar, sugiere reservar con "cualquiera"; si no, ofrece anotarse. Formulario de nombre y email, y `CodeStep` con el pedido de código de siempre. El 409 lleva a "ya hay horarios" y refresca los horarios del día.
- **Front, Salir.** Ruta `/lista-de-espera/<secreto>`: muestra Servicio y fecha y un botón que hace el POST. Después, y si `left` ya es `true`, muestra que ya salió con un enlace a Reservar otro día. 404 si el enlace no existe.
- **Front, Reservar desde el Aviso.** La página de reserva del Servicio lee `fecha` (deja elegido ese día si es válido) y `nombre` / `email` (precargan el formulario de Reservar). Parámetros inválidos se ignoran.

## Testing Decisions

- Se testea comportamiento externo: respuestas HTTP, mails mandados (el `Mailer` mockeado) y lo que queda guardado, nunca la forma interna del use case.
- **Back, HTTP** con la app de test (`createTestApp`, puertos mockeados y `TestClock`), como `booking-links.http.spec.ts`: anotarse (201, 200 idempotente, 400, 404, 409, 422), leer y Salir. Para el job se toma su use case de la misma app y se corre su `execute()`, con el `ListSlotsUseCase` real sobre los repositorios mockeados: se libera un horario y llega el Aviso; sigue con lugar y no se repite; se llena y se rearma; el mail falla y no se marca; el email tiene un Turno vivo y no se avisa. `createTestApp` suma el mock del repositorio de Anotaciones y los dos métodos del `Mailer`.
- **Back, Postgres real** (`*.db.spec.ts`, como `prisma-bookings.repository.db.spec.ts`): el unique parcial entre Anotaciones vivas, y la consulta del Turno vivo del email en una fecha de la zona del Servicio.
- No se hace un test unitario del use case del job con `ListSlotsUseCase` mockeado (como `send-rating-requests.use-case.spec.ts`): dejaría sin probar justamente qué es un día lleno.
- **Front**: tests unitarios de cada use case y controller nuevos con los puertos stubbeados por caso (`docs/agents/clean-architecture.md` § 7; prior art: `book-slot.*.test.ts`, `cancel-booking-by-link.*.test.ts`), y de la función pura que lee `fecha` / `nombre` / `email` de la URL.

## Out of Scope

- Que el Negocio vea quién está anotado, o cuántos hay por día (posible ticket aparte; entraría en la Ficha del Cliente).
- Orden de llegada o retener un horario para un anotado (descartado en la ADR 0034).
- Anotarse a una Serie o a varias fechas de una vez.
- Anotarse para un Empleado en particular.
- Avisar en el momento en que se libera el horario, sin la demora del job.
- Notificaciones que no sean por mail.

## Further Notes

- Un horario que se libera y se vuelve a tomar dentro del mismo ciclo del job no avisa a nadie (ADR 0034).
- La Anticipación mínima también llena un día (`FULLY_BOOKED`): una Anotación para hoy puede no recibir nunca un Aviso, y está bien.
- Si un día con Anotaciones pasa a no trabajarse (por ejemplo, se carga un período Fuera de la oficina), la Anotación se rearma y queda viva; avisa solo si ese día vuelve a tener lugar.

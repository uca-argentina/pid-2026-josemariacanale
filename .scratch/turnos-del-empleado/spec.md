# Turnos del Empleado: "mis turnos" deja de ser mock

Labels: `ready-for-agent`, `full-stack`

## Problem Statement

`agendic-front/app/(app)/bookings` es la vista de un Empleado logueado sobre los Turnos reservados
con él — no el panel del Negocio (ese es otro ticket, más adelante). Hoy es 100% maqueta:
`page.tsx` lee `mock-bookings.ts` directo, sin pasar por las capas de Clean Architecture del resto
del front, y cada acción (`BookingActions.tsx`, `BookingDetail.tsx`) muta un `useState` local sin
llamar a ningún endpoint. El mock inventó estados que el back no tiene (`pending`, `rejected`,
`no-show`, `rescheduled`, `rescheduleRequested`) para poder simular Aceptar/Rechazar, Cancelar,
Reagendar y Ausencia.

El back hoy solo modela `BookingStatus: UNVERIFIED | BOOKED | CANCELLED` y expone `POST /bookings`,
`POST /bookings/verification` y `GET /businesses/:id/bookings` (listado para el Dueño, no para un
Empleado cualquiera). No hay ningún endpoint de "mis turnos" para un Empleado, ni para Aceptar,
Rechazar, Cancelar (del lado Empleado), Reagendar o marcar Ausencia.

## Solution

Se completa el modelo de Turno con la Aprobación manual (ver `CONTEXT.md`): un Servicio puede pedir
que sus Turnos nazcan como Turno pendiente en vez de aceptarse solos, y el Empleado los Acepta o
Rechaza. Se agrega un endpoint self-service para que un Empleado liste sus propios Turnos en
cualquier Negocio del que sea Empleado activo, y endpoints para que actúe sobre ellos: Aceptar,
Rechazar, Cancelar, Reagendar y marcar Ausencia. El front reconecta `bookings/` a ese contrato real,
capa por capa, siguiendo el mismo patrón de Clean Architecture que ya usa `app/(app)/business/`.

Esto reabre a propósito un límite de la ADR 0013 ("el Empleado es un Usuario"), que dejó
deliberadamente sin pantallas a todo Empleado que no fuera Dueño. La ADR 0016 registra esa
reapertura: el Empleado gana su propia pantalla de Turnos, sin ganar ningún panel de Negocio.

"Pedir reagendamiento" (una acción que el mock tenía, distinta de Reagendar) no tiene concepto en el
glosario y queda fuera de este spec.

## User Stories

1. Como Empleado, quiero ver todos los Turnos reservados conmigo, en cualquier Negocio del que sea
   Empleado activo, para no tener que entrar a cada Negocio por separado.
2. Como Empleado, quiero ver el detalle de un Turno puntual (Cliente, Servicio, horario, estado),
   para decidir qué hacer con él.
3. Como Empleado, quiero que un Turno de un Servicio con Aprobación manual me llegue como Turno
   pendiente, para poder revisarlo antes de que quede confirmado.
4. Como Empleado, quiero Aceptar un Turno pendiente, para confirmárselo al Cliente.
5. Como Empleado, quiero Rechazar un Turno pendiente, para liberar ese Horario reservable cuando no
   puedo atenderlo.
6. Como Empleado, quiero Cancelar un Turno ya aceptado, para liberar ese Horario reservable cuando
   surge un imprevisto.
7. Como Empleado, quiero Reagendar un Turno ya aceptado a otro Horario reservable mío, sin que el
   Cliente tenga que volver a verificar su email.
8. Como Empleado, quiero marcar como Ausencia un Turno aceptado cuyo horario ya pasó y el Cliente no
   vino, para llevar registro de eso.
9. Como Empleado, quiero filtrar mis Turnos por Servicio, Sucursal/Negocio, nombre o email del
   Cliente, para encontrar uno puntual sin scrollear todo.
10. Como equipo, queremos que un Turno pendiente o aceptado siga ocupando su Horario reservable, para
    que dos Clientes no puedan reservar el mismo horario mientras uno espera que lo acepten.
11. Como equipo, queremos que el contrato nuevo quede documentado en ADR 0007, para que el front no
    tenga que leer el código del back.

## Implementation Decisions

### Dominio

- Términos nuevos: **Aprobación manual** (`Service.requiresApproval`) y **Turno pendiente**
  (`BookingStatus.PENDING`) — ver `CONTEXT.md`. **Ausencia** se afina: se marca a mano
  (`Booking.noShowAt`), no se calcula sola.
- `BookingStatus` gana `PENDING` y `REJECTED`: `UNVERIFIED → (PENDING | BOOKED) → (BOOKED | REJECTED
  | CANCELLED)`. `REJECTED` es distinto de `CANCELLED` porque Rechazar turno y Cancelar son acciones
  distintas del glosario (Rechazar actúa sobre un Turno pendiente, Cancelar sobre uno ya aceptado).
- ADR 0016 registrada: el Empleado tiene su propia pantalla de Turnos, sin panel de Negocio.
- Permisos: todas las acciones (Aceptar, Rechazar, Cancelar, Reagendar, Ausencia) las ejecuta
  solamente el Empleado asignado a ese Turno. El Dueño actuando por sus Empleados queda para cuando
  exista el panel de Negocio.

### Back

- `Service.requiresApproval: Boolean` (default `false`).
- `Booking.noShowAt: DateTime?` (nullable, no reemplaza `status`).
- La exclusion constraint `Booking_no_overlap` (ADR 0004) y el paso 5 del cálculo de Horarios
  reservables (`GET /services/:id/slots`, ADR 0007) pasan de descontar solo `BOOKED` a descontar
  `PENDING` y `BOOKED` — un Turno pendiente ocupa el horario igual que uno aceptado.
- `POST /bookings/verification`: al verificar, si `service.requiresApproval` es `true` pasa a
  `PENDING`; si no, a `BOOKED` (como hoy).
- Nuevos endpoints (todos con Sesión, solo el Empleado asignado al Turno):
  - `PATCH /bookings/:id/accept` — `PENDING → BOOKED`; 422 si no está `PENDING`.
  - `PATCH /bookings/:id/reject` — `PENDING → REJECTED`, libera el horario; 422 si no está
    `PENDING`.
  - `PATCH /bookings/:id/cancel` — `BOOKED → CANCELLED`, libera el horario; 422 si no está `BOOKED`.
  - `PATCH /bookings/:id/reschedule` — mueve un Turno `BOOKED` a otro Horario reservable del mismo
    Servicio y Empleado, sin repetir la Verificación de email; 409 si el nuevo horario choca con
    otro Turno `PENDING`/`BOOKED`; 422 si el Turno no está `BOOKED`.
  - `PATCH /bookings/:id/no-show` — marca `noShowAt`; 422 si el Turno no está `BOOKED` o si
    `endsAt` todavía no pasó.
  - Todas: 403 si quien llama no es el Empleado asignado a ese Turno; 404 si el Turno no existe.
- Nuevo endpoint de listado self-service:
  - `GET /employees/me/bookings` — con Sesión, resuelve el Usuario actual y lista los Turnos de
    **todos** sus Empleados activos (en cualquier Negocio), en cualquier estado. Necesita un método
    nuevo en el repositorio de Empleados para resolver "los Empleados activos de este Usuario"
    (hoy no existe: `EmployeesRepository` solo resuelve por `id` o por Negocio).
  - Respuesta por Turno: `{ id, status, startsAt, endsAt, clientName, clientEmail, noShowAt,
    serviceId, serviceName, businessId, businessName, branchId, branchName }` — el Empleado puede
    trabajar en más de un Negocio, así que cada Turno necesita decir de cuál es.
- Todo esto queda documentado en `docs/adr/0007-endpoints-de-la-api.md` (secciones Services,
  Bookings, y una nueva para el listado self-service de Employees).

### Front

- `app/(app)/bookings/page.tsx` deja de leer `mock-bookings.ts` directo: pasa a pedir los datos vía
  `getInjection('IListMyBookingsController')`, igual que `app/(app)/business/page.tsx`, con la misma
  resolución de Sesión de Clerk (`getCurrentUser()` → redirect a sign-in si no hay Sesión).
  `app/(app)/bookings/[bookingId]/page.tsx` pide la misma lista completa y busca el Turno por id
  (sin endpoint de detalle nuevo, dataset chico por Empleado).
- Nuevo repositorio `bookings.repository.ts` en `infrastructure/`, mismo patrón que
  `businesses.repository.ts`: Bearer del Clerk JWT, `ApiRequestError` en fallas, Zod para parsear la
  respuesta.
- `BookingActions.tsx` y `BookingDetail.tsx` dejan de mutar `useState` local: cada acción es una
  server action (`'use server'`) que llama al controlador correspondiente, sigue el patrón de
  `unstable_rethrow` → mapeo de errores de dominio por `instanceof` → `ICrashReporterService.report`
  para lo inesperado, y `revalidatePath`/`refresh()` tras una mutación exitosa.
- Reagendar reutiliza el flujo de slots (`GET /services/:id/slots`) igual que el flujo público de
  reserva: el Empleado elige un nuevo horario entre los suyos disponibles.
- El botón "Pedir reagendamiento" se saca de `BookingActions.tsx` — no tiene endpoint ni concepto de
  dominio, queda para una spec futura si hace falta.
- Los tabs existentes (Próximos/Pendientes/Pasados/Cancelados) se remapean al `BookingStatus` real:
  Pendientes = `PENDING`; Próximos = `BOOKED` con `startsAt` futuro; Pasados = `BOOKED` con `endsAt`
  pasado (mostrando la etiqueta de Ausencia si tiene `noShowAt`); Cancelados agrupa `CANCELLED` y
  `REJECTED`, distinguiendo la etiqueta de cada uno.
- Filtros de Servicio/Sucursal/Cliente y paginación se mantienen client-side sobre la lista completa
  que trae `GET /employees/me/bookings` (mismo patrón que hoy, sin cambiar el contrato del
  endpoint). El filtro de "empleado" se saca: en esta vista el Empleado siempre es el Usuario actual.

## Testing Decisions

### Back

Seam existente (`createTestApp()` + repos mockeados + supertest; tests de repositorio contra base
real para lo que el mock no puede ver).

- Verificar un Turno de un Servicio con `requiresApproval` → queda `PENDING`, no `BOOKED`.
- `PATCH /bookings/:id/accept`/`reject` sobre un Turno que no está `PENDING` → 422; ejecutado por
  otro Empleado que no es el asignado → 403.
- `PATCH /bookings/:id/cancel` sobre un Turno que no está `BOOKED` → 422.
- `PATCH /bookings/:id/reschedule` a un horario que choca con otro Turno `PENDING`/`BOOKED` del
  mismo Empleado → 409; a un horario libre → mueve `startsAt`/`endsAt`, mantiene `BOOKED`.
- `PATCH /bookings/:id/no-show` antes de que pase `endsAt` → 422; después → guarda `noShowAt`.
- `GET /employees/me/bookings` de un Usuario que es Empleado activo en dos Negocios distintos →
  devuelve los Turnos de ambos, cada uno con su `businessId`/`branchName` correcto; de un Usuario sin
  ningún Empleado activo → lista vacía, no error.
- Dos `POST /bookings` para el mismo horario mientras uno está `PENDING` (no solo `BOOKED`) →
  el segundo 409 (constraint extendida).
- `GET /services/:id/slots` no ofrece un horario tomado por un Turno `PENDING`.

### Front

Tests unitarios por capa con puertos stubeados (mismo patrón que el resto de `app/(app)/business/`):

- **Página `bookings/`**: sin Sesión → redirect a sign-in; con Sesión → arma la lista pedida al
  controlador, sin tocar `mock-bookings.ts`.
- **Página `bookings/[bookingId]`**: Turno encontrado en la lista → lo muestra; no encontrado →
  `notFound()`.
- **Server actions de Aceptar/Rechazar/Cancelar/Ausencia**: arman el body/ruta correctos; mapean
  403/404/422/409 al `{ ok: false, message }` que puede mostrar la UI; error inesperado → se reporta
  vía `ICrashReporterService`.
- **Reagendar**: pide los slots reales antes de confirmar; envía el `startsAt` elegido; 409 se
  muestra como "elegí otro horario", sin reportarse al crash reporter.
- **Adaptador de `bookings.repository.ts`**: 200 parseado con Zod; 403/404/409/422 mapeados a
  errores de dominio.

## Out of Scope

- El panel del Negocio para gestionar Turnos (el Dueño viendo/actuando sobre los Turnos de sus
  Empleados): spec aparte, más adelante.
- "Pedir reagendamiento": no tiene concepto de dominio definido todavía.
- Endpoint de detalle de un Turno (`GET /bookings/:id`): la vista de detalle se resuelve con la
  lista completa; se agrega el día que el volumen de Turnos por Empleado lo justifique.
- Filtrado o paginación server-side de `GET /employees/me/bookings`: se mantiene client-side.
- Notificaciones al Cliente cuando el Empleado Acepta, Rechaza, Cancela, Reagenda o marca Ausencia
  (hoy el back ya manda la Confirmación de reserva al crear el Turno; avisos adicionales por estas
  acciones son una spec aparte si hace falta).
- Elegir qué Servicios tienen Aprobación manual desde una pantalla del panel: alcanza con que el
  campo y el endpoint de Servicio lo acepten; la UI para tildarlo es otro ticket si no existe ya un
  lugar natural en el panel de Servicios.

## Further Notes

- El ticket de back `agendic-back/.scratch/reserva-real-por-sucursal/issues/03-sena-y-comentario-del-turno.md`
  (de otra spec, en paralelo) ya anticipaba esta evolución al decir que `Aprobación manual` y
  `BookingStatus.PENDING/REJECTED` son ortogonales a `notes`/`depositPercent`. Son specs
  independientes; no hay bloqueo entre ellas, pero ambas tocan `docs/adr/0007-endpoints-de-la-api.md`
  y `Booking`/`Service` — quien implemente la segunda en el tiempo debe rebasear el ADR y el schema
  contra lo que la primera ya haya mergeado.
- Split de tickets (`docs/agents/issue-tracker.md`): dos tickets de back (`01`: Aprobación manual +
  Turno pendiente + constraint extendida; `02`: mis turnos del Empleado + Cancelar/Reagendar/Ausencia)
  y dos de front (`03`: conectar lista y detalle; `04`: conectar acciones), cada front bloqueado por
  el back correspondiente.

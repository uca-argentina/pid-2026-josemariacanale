# Endpoints de la API para el front

El front (`agendic-front/`) necesita saber qué endpoints expone el back (`agendic-back/`) y para
qué sirve cada uno. Este documento no registra una decisión de arquitectura sino el contrato actual
de la API, a pedido explícito para que el front lo consulte. No se genera automáticamente: hay que
actualizarlo a mano cuando se agregue, cambie o borre un endpoint.

## Notas generales

- Sin prefijo global de rutas (`POST /users`, no `/api/users`).
- Auth: las rutas marcadas "sí" requieren header `Authorization: Bearer <sessionId>`, resuelto por
  `SessionGuard`.
- `ValidationPipe` global con `forbidNonWhitelisted: true`: un campo extra en el body devuelve 400,
  no se descarta en silencio.
- Forma de error (`DomainExceptionFilter`): `{ statusCode, message }`. Mapeo de errores de dominio:
  `Unauthenticated` → 401, `Forbidden` → 403, `NotFound` → 404, `InvalidCode` → 400, `Conflict` →
  409, `Expired` → 410, `BusinessRule` → 422, resto → 500.
- CORS habilitado para todos los orígenes.

## Sessions

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/sessions` | no | Login con email/password, devuelve una sesión |
| DELETE | `/sessions/current` | sí | Logout (invalida la sesión actual); 204 |

- `SignInDto`: `{ email, password }`
- Respuesta (`presentSession`): `{ sessionId, expiresAt }`

## Users (Usuario)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/users` | no | Alta de un Usuario |
| POST | `/users/verification` | no | Verifica email con código de 6 caracteres, devuelve sesión (auto-login) |
| POST | `/users/verification/resend` | no | Reenvía el código de verificación; 204 |
| GET | `/users/me` | sí | Perfil del usuario actual |
| PATCH | `/users/me` | sí | Actualiza name/email (cambiar email vuelve a disparar verificación vía `pendingEmail`) |

- `SignUpDto`: `{ name, email, password (12-72 chars) }`
- `VerifyEmailDto`: `{ email, code }`
- `ResendVerificationDto`: `{ email }`
- `UpdateMeDto`: `{ name?, email? }`
- Respuesta (`presentUser`): `{ id, name, email, pendingEmail? (solo si está seteado), role }`

## Businesses (Negocio)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/businesses` | sí | Crea un negocio junto con su primera sucursal, servicio y empleado (alta todo-en-uno); el Empleado creado es el propio Dueño (su Usuario de Sesión, ADR 0013), con su Availability predeterminada "Horario general": lunes a viernes de 09:00 a 18:00, sábado y domingo sin Franjas, y el primer servicio queda atendido por ese Empleado con esa Availability, todo en la misma transacción (no viene en la respuesta; se lee con `GET /employees/:id/availabilities`); 409 si el Usuario ya es Dueño de un Negocio (ADR 0012) |
| PATCH | `/businesses/:id` | sí | Actualiza name/description/slug (solo el dueño); cambiar el slug deja de servir el Enlace de reserva anterior |
| GET | `/businesses` | sí | Lista solo los negocios del Dueño de la sesión (0 o 1) |
| GET | `/businesses/:id` | no | Detalle de un negocio |
| GET | `/businesses/by-slug/:slug` | no | Detalle de un negocio por su Enlace de reserva; el slug se compara en minúsculas; 404 si no existe |

- `CreateBusinessDto`: `{ business: { name, description, slug }, branch: { name, address, opensAt, closesAt, timeZone, slug? }, service: ServiceFieldsDto }`; `branch` valida sus campos igual que `CreateBranchDto` del endpoint de Sucursales, salvo que su `slug` es opcional: sin él, la primera Sucursal toma el `slug` del Negocio
- `UpdateBusinessDto`: `{ name?, description?, slug? }`
- `slug` (Enlace de reserva): se pasa a minúsculas, 3-40 caracteres, palabras de letras y dígitos unidas por guiones (`^[a-z0-9]+(-[a-z0-9]+)*$`); formato inválido → 400, slug ya tomado → 409
- Respuesta (`presentBusiness`): `{ id, name, description, slug, ownerId }`
- Respuesta del POST: `{ business, branch, service, employee }` (cada uno con su propio presenter)

## Branches (Sucursal)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/businesses/:businessId/branches` | sí | Crea una sucursal bajo un negocio (solo el dueño); 409 si su `slug` ya está en uso en ese negocio |
| PATCH | `/branches/:id` | sí | Actualiza una sucursal (solo el dueño); 409 si su `slug` ya está en uso en ese negocio; cambiar el `slug` deja de servir el Enlace de reserva anterior de esa sucursal |
| GET | `/businesses/:businessId/branches` | no | Lista sucursales de un negocio |

- `CreateBranchDto`: `{ name, address, opensAt: "HH:mm", closesAt: "HH:mm", timeZone, slug }`
- `slug` (tramo de Sucursal del Enlace de reserva, ADR 0014: `/business/<slug del negocio>/<slug de la sucursal>`): mismo formato que el `slug` del Negocio (se pasa a minúsculas, 3-40 caracteres, `^[a-z0-9]+(-[a-z0-9]+)*$`); requerido en creación, opcional en `UpdateBranchDto`; formato inválido → 400; ya usado por otra sucursal del mismo negocio → 409 `Booking link already in use` (dos negocios distintos sí pueden repetirlo)
- `timeZone`: nombre IANA (por ejemplo `America/Argentina/Buenos_Aires`), nunca un offset; requerido en creación, opcional en `UpdateBranchDto`; inválido → 400
- `UpdateBranchDto`: los mismos campos, todos opcionales
- Respuesta (`presentBranch`): `{ id, businessId, name, address, opensAt, closesAt, timeZone, slug }`

## Imágenes de Sucursal (BranchImage)

Los archivos viven en el storage externo (ADR 0015); cada imagen es una URL pública. Listarlas es
público; subir, borrar y ordenar es solo del Dueño del Negocio de la Sucursal: cualquier otro
Usuario recibe 403. Las filas se borran en cascada con la Sucursal (hoy no hay endpoint que borre
una Sucursal); sus archivos en el storage no.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/branches/:id/images` | no | Las imágenes de la Sucursal, ordenadas por `order`; 404 si la Sucursal no existe |
| POST | `/branches/:id/images` | sí | Sube una imagen y la agrega al final; 201 con la imagen |
| DELETE | `/branches/:id/images/:imageId` | sí | Borra la imagen y su archivo; 204 |
| PUT | `/branches/:id/images/order` | sí | Reemplaza el orden de todas las imágenes; 200 con la lista ya ordenada |

- POST: `multipart/form-data` con la imagen en el campo `file`. Sin archivo → 400 `file is required`; tipo que no es `image/jpeg`, `image/png`, `image/webp` o `image/gif` → 400 `La imagen tiene que ser JPEG, PNG, WebP o GIF`; más de 5 MB → 413
- `ReorderBranchImagesDto`: `{ imageIds: number[] }`, la lista completa de imágenes de la Sucursal en el orden deseado (mismo criterio de reemplazo total que `PUT /employees/:id/overrides/:date`). Falta `imageIds`, id repetido o que no es entero → 400; algún id que no es una imagen de esa Sucursal → 404; lista que deja afuera alguna → 422 `El orden tiene que incluir todas las imágenes de la Sucursal`
- DELETE de una imagen que no es de esa Sucursal (o no existe) → 404; si el archivo no se puede borrar del storage igual responde 204 (queda un archivo sin uso, nunca una imagen rota)
- Respuesta (`presentBranchImage`): `{ id, branchId, url, order }`. `order` es ascendente pero no necesariamente contiguo (borrar deja huecos); el front ordena por él, no lo usa como índice

## Services (Servicio)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/branches/:id/services` | sí | Crea un servicio bajo una sucursal, con asignación inicial de empleados (solo el dueño); cada empleado entra con su Availability predeterminada; 409 si el tramo (`slug`) ya lo usa otro servicio activo de esa sucursal |
| PATCH | `/services/:id` | sí | Actualiza un servicio (solo el dueño), incluidos `slug` y `hidden`; 409 si el tramo ya está en uso en esa sucursal |
| DELETE | `/services/:id` | sí | Da de baja (soft-delete) un servicio (solo el dueño) |
| POST | `/services/:id/employees` | sí | Ofrecer: asigna un empleado a un servicio con una Availability suya (el dueño, o el propio Empleado); 200 con el servicio; 403 si un Empleado actúa por otro o no es Empleado activo del Negocio; 404 si no existe, o si está oculto y quien llama no es dueño ni lo atiende; 422 si la Availability es de otro Empleado o si el servicio está dado de baja; 409 si ya lo atiende |
| PATCH | `/services/:id/employees/:employeeId` | sí | Cambia la Availability con la que ese empleado atiende el servicio (el dueño, o el propio Empleado); 200 con el servicio; 422 si la Availability es de otro Empleado; 404 si ese empleado no atiende el servicio o la Availability no existe; no cancela ni mueve Turnos |
| DELETE | `/services/:id/employees/:employeeId` | sí | Dejar de ofrecer: quita un empleado de un servicio (el dueño, o el propio Empleado); `{ cancelledBookings }` con los Turnos futuros cancelados; 422 `Cannot remove the Service's last Employee` si es el último |
| GET | `/branches/:id/services` | no | Lista servicios activos de una sucursal, sin los ocultos; 404 si la sucursal no existe |
| GET | `/branches/:id/services/by-slug/:slug` | no | Un servicio de la sucursal por su tramo del Enlace de reserva (ADR 0018), aunque esté oculto; el tramo se compara en minúsculas; 404 si la sucursal no existe o si ningún servicio suyo no dado de baja tiene ese tramo |

- `CreateServiceDto`: `{ name, description?, category, durationMinutes (int ≥1), price (number ≥0), depositPercent?, requiresApproval?, slug, hidden?, employeeIds: number[] (no vacío) }`
- `slug` es el tramo del Servicio en el Enlace de reserva (ADR 0018): obligatorio al crear, en minúsculas, mismas reglas que el de Sucursal; único por sucursal entre los servicios no dados de baja (índice parcial, ADR 0004; un tramo de un servicio dado de baja queda libre). `hidden` (por defecto `false`) es el Servicio oculto. El servicio del body de `POST /businesses` también exige `slug` y acepta `hidden`.
- Servicio oculto (`hidden: true`): no sale en `GET /branches/:id/services`, pero `by-slug` lo devuelve y sus Horarios reservables y `POST /bookings` funcionan igual que los de uno visible. Ocultar no es una medida de seguridad, es sacarlo de la vidriera. El front abre la página de la Sucursal con el Servicio ya elegido pidiéndolo por su tramo, y trata el 404 como página no encontrada.
- Respuesta del servicio (`presentService`): suma `slug`, `hidden` y, en cada elemento de `employees`, `availabilityId`: `{ id, name, availabilityId }`
- `UpdateServiceDto`: `{ name?, description?, category?, durationMinutes?, price?, depositPercent?, requiresApproval? }`
- `depositPercent` (Seña): entero de 0 a 100, porcentaje del precio. Es simbólica: se guarda y se
  muestra, no dispara ningún cobro. Sin él, el Servicio no pide Seña (`null` en la respuesta). Fuera
  de 0-100, con decimales o no numérico → 400. En creación no acepta `null`; en `PATCH`,
  `depositPercent: null` le saca la Seña. También vale en el `service` de `POST /businesses`.
- `requiresApproval` (Aprobación manual): booleano, `false` por defecto. Con `true`, los Turnos del Servicio
  no quedan `BOOKED` al verificarse sino `PENDING`, hasta que el Empleado los Acepta o los Rechaza.
  No booleano → 400. También vale en el `service` de `POST /businesses`.
- `AssignEmployeeDto`: `{ employeeId, availabilityId? }`; sin `availabilityId`, el empleado entra con su Availability predeterminada
- `ChangeEmployeeAvailabilityDto`: `{ availabilityId }`; falta o no es entero → 400
- **Quién gestiona los Empleados de un servicio** (ADR 0017): el Dueño, por cualquiera del Staff, o el propio Empleado, cuando `employeeId` es su Empleado activo en el Negocio del servicio. Un Empleado que actúa por otro, uno dado de baja o un Usuario que no es Empleado de ese Negocio recibe 403 `Only the Dueño or that same Empleado can do this`. El front muestra tal cual el `message` del 422 del último Empleado e informa `cancelledBookings` al dejar de ofrecer.
- Cada empleado atiende el servicio con una de sus Availability. Es una referencia: editar esa
  Availability (`PATCH /availabilities/:id`) cambia en el acto todos los servicios que la usan. La
  respuesta del servicio no dice cuál usa cada empleado.
- Respuesta (`presentService`): `{ id, branchId, name, description, category, durationMinutes, price, depositPercent, requiresApproval, employees: [{id, name}] }`; `depositPercent` es `null` si el Servicio no pide Seña
- `category` es un enum fijo: `CLINICA | SPA | GIMNASIO | ACADEMIA | OTRO`, requerido en creación

## Employees (Empleado)

Todo Empleado es un Usuario (ADR 0013): nombre y email los presta su cuenta, no se cargan a mano.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/businesses/:id/employees` | sí | Invita a un email a ser Empleado (solo el dueño, ADR 0019): crea una Invitación pendiente que vence a los 7 días, no un Empleado. Si ningún Usuario tiene ese email, Clerk le manda el mail para crearse una cuenta (si Clerk dice que ya tiene cuenta, no es error); si ya es Usuario no hay mail. 201 con la Invitación; 200 con la misma si ya estaba pendiente en ese negocio (se reenvía el mail si corresponde); 422 "ya es Empleado" si el email es de un empleado activo del negocio; 403/404 si no es el dueño o el negocio no existe; 502 si Clerk falla, sin crear nada |
| GET | `/businesses/:id/invitations` | sí | Lista las Invitaciones pendientes (no vencidas) del negocio (solo el dueño) |
| GET | `/invitations/me` | sí | Invitaciones pendientes y no vencidas dirigidas al email de la Sesión (sin distinguir mayúsculas): `[{ id, business: { name, slug } }]` |
| POST | `/invitations/:id/accept` | sí | Aceptar invitación (ADR 0019): crea el Empleado del Negocio, con su Availability predeterminada, y cierra la Invitación; 200 con el empleado; puede aceptar aunque sea Dueño de otro Negocio; 404 si no existe o no es de su email; 422 "La invitación venció"; 422 "ya es Empleado" (también al aceptar dos veces) |
| POST | `/invitations/:id/reject` | sí | Rechaza la Invitación y la cierra sin crear Empleado; 204; 404 / 422 como arriba |
| POST | `/invitations/:id/resend` | sí | El Dueño reenvía la Invitación (ADR 0019): renueva el vencimiento a 7 días y reenvía el mail de Clerk solo si la persona todavía no es Usuario; 200 con la Invitación; 404 si no existe o no es de su Negocio; 422 si ya se aceptó o rechazó; 502 si Clerk falla |
| DELETE | `/invitations/:id` | sí | El Dueño cancela la Invitación pendiente: la cierra, deja de listarse y ya no se puede aceptar; 204; 404 / 422 como arriba |
| DELETE | `/employees/:id` | sí | Da de baja (soft-delete) un empleado (solo el dueño); 422 si es el Dueño dándose de baja a sí mismo |
| GET | `/businesses/:id/employees` | sí | Lista empleados activos de un negocio (solo el dueño) |
| GET | `/employees/me/services` | sí | Catálogo de Servicios del panel: un grupo por cada Negocio del que el Usuario es Empleado activo; `[]` (200) si no lo es de ninguno |
| GET | `/employees/me/bookings` | sí | Mis turnos: todos los Turnos, en cualquier estado, del Usuario de la Sesión como Empleado activo, en todos los Negocios donde lo es; lista vacía (200) si no es Empleado activo de ninguno |

- Respuesta de `GET /employees/me/services` (`presentCatalogGroup`): `[{ business: { id, name, slug }, role: "owner" | "employee", employeeId, branches: [{ id, name, slug, services: [Servicio] }] }]`. `employeeId` es el Empleado del Usuario en ese Negocio; `role` es `owner` si es su Dueño. Las sucursales van ordenadas por `slug` y aparecen aunque no tengan servicios; no trae servicios dados de baja; un servicio oculto sale solo si el Usuario es Dueño del Negocio o lo atiende. Un Empleado dado de baja de un Negocio deja de recibir ese grupo.
- Respuesta de `GET /employees/me/bookings` (`presentEmployeeBooking`), un elemento por Turno, del más próximo al más lejano: `{ id, employeeId, status, startsAt, endsAt, clientName, clientEmail, noShowAt, serviceId, serviceName, businessId, businessName, branchId, branchName }`; `noShowAt` es `null` mientras el Turno no tiene Ausencia

- `CreateEmployeeDto`: `{ email }`
- Respuesta (`presentEmployee`): `{ id, userId, name, email }` — vista del dueño; en el array
  `employees` de un Service la vista pública es solo `{ id, name }`.
- Recontratar a alguien dado de baja crea una fila nueva: no hay `PATCH` para reactivarlo.

## Availability (Horas laborables)

Cada Empleado tiene una o más Availability, exactamente una predeterminada. Todo es del Dueño del
Negocio del Empleado: cualquier otro Usuario recibe 403. La única excepción es leerlas: el propio
Empleado activo también puede (ADR 0017); crear, editar, marcar predeterminada y borrar siguen
siendo solo del Dueño.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/employees/:id/availabilities` | sí | Las Availability del Empleado con sus Franjas; además del Dueño, las lee el propio Empleado activo (ADR 0017) |
| POST | `/employees/:id/availabilities` | sí | Crea una con sus Franjas; la primera del Empleado nace predeterminada; 201 |
| PATCH | `/availabilities/:id` | sí | Cambia el nombre y/o reemplaza el set entero de Franjas; sin `intervals` no las toca |
| POST | `/availabilities/:id/default` | sí | La marca predeterminada y desmarca la anterior; 200 con la Availability |
| DELETE | `/availabilities/:id` | sí | La borra con sus Franjas; 204; 422 si es la predeterminada; 409 si algún servicio la usa |

- `CreateAvailabilityDto`: `{ name, intervals: [{ weekday: 0-6, startTime: "HH:mm", endTime: "HH:mm" }] }`
- `UpdateAvailabilityDto`: `{ name?, intervals? }`; `isDefault` no se acepta acá (400), va por `POST /availabilities/:id/default`
- `weekday`: 0 = domingo … 6 = sábado, igual que `Date.getUTCDay()`
- Las Franjas no tienen endpoints propios: se mandan enteras dentro de la Availability. Un día sin
  Franjas es un día que no se trabaja; `intervals: []` es válido.
- Respuesta (`presentAvailability`): `{ id, employeeId, name, isDefault, intervals: [{ weekday, startTime, endTime }] }`, Franjas ordenadas por día y hora de inicio
- Errores (el front muestra el `message` tal cual):
  - dos Franjas del mismo día que se solapan → 422 `Dos Franjas del mismo día se solapan`; dos que se tocan (09:00–17:00 y 17:00–18:00) se aceptan
  - una Franja cuyo fin no es posterior al inicio → 422 `Cada Franja tiene que terminar después de empezar`
  - borrar la predeterminada → 422 `No se puede borrar la Availability predeterminada`
  - borrar una que usa algún servicio → 409 `No se puede borrar la Availability: la usan 2 Servicios` (o `la usa 1 Servicio`); el front muestra el `message` tal cual. Un servicio dado de baja ya no la usa
  - `weekday` fuera de 0–6, hora que no es `HH:mm`, campo extra → 400
  - Empleado o Availability inexistente → 404
  - dos pedidos concurrentes que dejarían dos predeterminadas → 409

## Anulaciones (AvailabilityOverride)

Cuelgan del Empleado, no de una Availability: tapan todos sus Servicios. Todo es del Dueño del Negocio
del Empleado: cualquier otro Usuario recibe 403.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/employees/:id/overrides` | sí | Las Anulaciones del Empleado, agrupadas por fecha |
| PUT | `/employees/:id/overrides/:date` | sí | Reemplaza las Anulaciones de esa fecha; lista vacía es día libre; puede sumar `coveredByEmployeeId` para nombrar quién cubre |
| DELETE | `/employees/:id/overrides/:date` | sí | Saca las Anulaciones de esa fecha; 204; esa fecha vuelve al horario semanal |

- `:date` es `YYYY-MM-DD`; otro formato → 400
- `ReplaceOverridesDto`: `{ intervals: [{ startTime: "HH:mm", endTime: "HH:mm" }], coveredByEmployeeId? }`; `intervals: []` es día libre
- Respuesta (`presentOverride`): `{ date, intervals: [{ startTime, endTime }], coveredByEmployeeId }`; `intervals: []` es día libre. El GET devuelve un array de esos, ordenado por fecha
- Las Franjas de una Anulación siguen las mismas reglas que las de una Availability (dos Franjas del mismo día que se solapan → 422 `Dos Franjas del mismo día se solapan`; una que termina antes o al mismo tiempo que empieza → 422 `Cada Franja tiene que terminar después de empezar`; dos que se tocan se aceptan)
- **Cobertura**: `coveredByEmployeeId` tiene que ser un Empleado activo del mismo Negocio y atender todos los Servicios de quien se ausenta; si no, 422 `La Cobertura tiene que ser un Empleado activo del mismo Negocio` o `La Cobertura tiene que atender todos los Servicios de quien se ausenta`. Activarla reasigna, en la misma transacción, los Turnos `PENDING` y `BOOKED` de quien se ausenta en esa fecha a quien cubre; si alguno choca con un Turno ya confirmado de quien cubre, 409 `El cubridor ya tiene un Turno a esa hora` y no se guarda nada. Sacar la Anulación (`DELETE`) no revierte los Turnos ya reasignados

## Slots (Horario reservable)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/services/:id/slots` | no | Los Horarios reservables de un Servicio con un Empleado, día por día, en un rango de fechas |

- Query: `employeeId` (int, requerido), `from`/`to` (`YYYY-MM-DD`, fechas locales de la Sucursal, inclusive, requeridos); falta alguno o formato inválido → 400
- Rango de hasta 31 días; más, o `to` anterior a `from` → 422
- Servicio inexistente o dado de baja → 404; Empleado que no atiende ese Servicio → 404
- Todo el cálculo corre en la zona horaria de la Sucursal del Servicio; la respuesta trae instantes UTC:
  1. Arranca de las Franjas de la Availability con la que ese Empleado atiende ese Servicio, por día de la semana
  2. Una Anulación de esa fecha reemplaza esas Franjas por completo (día sin horas = día libre)
  3. Recorta contra `opensAt`/`closesAt` de la Sucursal (nunca toca la Availability)
  4. Grilla de a 15 minutos fijos; entra el horario si el Servicio completo termina antes o al mismo tiempo que el fin de la Franja
  5. Descuenta los Turnos `PENDING` y `BOOKED` de ese Empleado (un Turno pendiente ocupa su horario igual que uno aceptado) que pisen el horario, en cualquiera de sus Servicios
  6. Descarta lo que ya pasó según el reloj del sistema; un día ya pasado no viene
- Respuesta: `{ timeZone, days: [{ date, slots: [ISO instants], reason?, coveredByEmployeeId? }] }`. `reason` solo aparece cuando `slots` está vacío: `NOT_WORKING` (sin Franjas, Anulación de día libre, o nada sobrevive el recorte), `FULLY_BOOKED` (había horarios pero los Turnos o el reloj se los llevaron todos), o `COVERED` (la fecha tiene una Anulación con Cobertura; no se calcula nada más y el día trae además `coveredByEmployeeId`)

## Bookings (Turno)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/bookings` | no | Crea un turno (el cliente reserva un horario); queda `UNVERIFIED` y se envía email de verificación |
| POST | `/bookings/verification` | no | Verifica un turno por token (del link del email); re-chequea todas las reglas, puede devolver 409 si el horario se ocupó mientras tanto. Queda `BOOKED`, o `PENDING` si el Servicio tiene `requiresApproval` |
| PATCH | `/bookings/:id/accept` | sí | Acepta un Turno pendiente: `PENDING` → `BOOKED` (solo el Empleado asignado) |
| PATCH | `/bookings/:id/reject` | sí | Rechaza un Turno pendiente: `PENDING` → `REJECTED`, libera el horario (solo el Empleado asignado) |
| PATCH | `/bookings/:id/cancel` | sí | Cancela un Turno aceptado: `BOOKED` → `CANCELLED`, libera el horario (solo el Empleado asignado) |
| PATCH | `/bookings/:id/reschedule` | sí | Reagenda un Turno aceptado a otro Horario reservable del mismo Servicio y Empleado; sigue `BOOKED` y no repite la Verificación de email (solo el Empleado asignado) |
| PATCH | `/bookings/:id/no-show` | sí | Marca la Ausencia de un Turno aceptado cuyo horario ya pasó: guarda `noShowAt` con la hora actual, sin cambiar `status` (solo el Empleado asignado) |
| GET | `/businesses/:id/bookings` | sí | Lista todos los turnos de un negocio (solo el dueño) |

- `CreateBookingDto`: `{ serviceId, employeeId, startsAt: ISO date-string, clientName, clientEmail, notes? }`
- `notes` (Comentario del Turno): texto libre, se recorta; hasta 500 caracteres. Vacío o solo espacios se guarda como sin Comentario (`null`). Más largo, no string o `null` → 400. No se valida el contenido
- `VerifyBookingDto`: `{ token }`
- Respuesta (`presentBooking`): `{ id, serviceId, employeeId, startsAt, endsAt, status, notes }`; `notes` es `null` si el Cliente no dejó Comentario del Turno
- Respuesta solo-dueño (`presentBookingForOwner`, usada en el listado): agrega `clientName, clientEmail`
- **Ciclo de vida**: `UNVERIFIED` → (verificar) → `BOOKED`, o `PENDING` si el Servicio tiene Aprobación
  manual; de `PENDING`, Aceptar → `BOOKED` y Rechazar → `REJECTED`. `POST /bookings` siempre crea
  `UNVERIFIED`, con o sin `requiresApproval`.
- **Aceptar / Rechazar**: exigen Sesión y que el usuario sea el Empleado asignado al Turno (403 `Only the assigned Employee can accept or reject this Turno` si no; 404 si el Turno no existe). Un Turno que no
  está `PENDING` da 422 `Turno is not pending`. Responden el Turno (`presentBooking`).
- **Cancelar / Reagendar / Ausencia**: exigen Sesión y ser el Empleado asignado al Turno (403 `Only the assigned Employee can act on this Turno`; 404 si el Turno no existe). Un Turno que no está `BOOKED` da 422 `Turno is not booked`. Responden el Turno (`presentBooking`); Ausencia le suma `noShowAt`.
  - `RescheduleBookingDto`: `{ startsAt: ISO date-string }`; la duración se conserva. `startsAt` inválido → 400. Si pisa otro Turno `PENDING` o `BOOKED` del Empleado (sin contar el propio) → 409 `Overlaps a booked Turno for this Employee`; si no es un Horario reservable según las mismas reglas que `GET /services/:id/slots` (Franjas, Anulaciones, Sucursal, reloj) → 422 `startsAt is not a Horario reservable`. El horario que el Turno ya ocupaba cuenta como libre.
  - Ausencia: 422 si el Turno no terminó todavía (`Turno has not ended yet`) o ya tiene Ausencia (`Turno already has an Ausencia`).
- **Horario ocupado (409 `Overlaps a booked Turno for this Employee`)**. Un Turno sin verificar no
  mantiene reservado su horario: lo toma recién al verificarse. Por eso:
  - `POST /bookings` → 409 si el horario pisa un Turno `PENDING` o `BOOKED` del mismo Empleado.
  - Dos `POST /bookings` para el mismo horario, aunque lleguen casi juntos, dan los dos 201: ninguno
    ocupa el horario todavía.
  - La carrera se decide al verificar: el primer `POST /bookings/verification` gana y el otro recibe
    409, aunque los dos verifiquen casi al mismo tiempo. Lo garantiza la exclusion constraint
    `Booking_no_overlap` de Postgres (ADR 0004), no solo el chequeo del caso de uso.

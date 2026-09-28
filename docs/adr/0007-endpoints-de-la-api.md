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
| POST | `/branches/:id/services` | sí | Crea un servicio bajo una sucursal, con asignación inicial de empleados (solo el dueño); cada empleado entra con su Availability predeterminada |
| PATCH | `/services/:id` | sí | Actualiza un servicio (solo el dueño) |
| DELETE | `/services/:id` | sí | Da de baja (soft-delete) un servicio (solo el dueño) |
| POST | `/services/:id/employees` | sí | Asigna un empleado a un servicio con una Availability suya (solo el dueño); 201 con el servicio; 422 si la Availability es de otro Empleado o si el servicio está dado de baja; 404 si no existe; 409 si ya lo atiende |
| DELETE | `/services/:id/employees/:employeeId` | sí | Quita un empleado de un servicio (solo el dueño) |
| GET | `/branches/:id/services` | no | Lista servicios activos de una sucursal |

- `CreateServiceDto`: `{ name, description?, category, durationMinutes (int ≥1), price (number ≥0), employeeIds: number[] (no vacío) }`
- `UpdateServiceDto`: `{ name?, description?, category?, durationMinutes?, price? }`
- `AssignEmployeeDto`: `{ employeeId, availabilityId? }`; sin `availabilityId`, el empleado entra con su Availability predeterminada
- Cada empleado atiende el servicio con una de sus Availability. Es una referencia: editar esa
  Availability (`PATCH /availabilities/:id`) cambia en el acto todos los servicios que la usan. La
  respuesta del servicio no dice cuál usa cada empleado.
- Respuesta (`presentService`): `{ id, branchId, name, description, category, durationMinutes, price, employees: [{id, name}] }`
- `category` es un enum fijo: `CLINICA | SPA | GIMNASIO | ACADEMIA | OTRO`, requerido en creación

## Employees (Empleado)

Todo Empleado es un Usuario (ADR 0013): nombre y email los presta su cuenta, no se cargan a mano.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/businesses/:id/employees` | sí | Agrega un empleado a un negocio por su email (solo el dueño), con su Availability predeterminada "Horario general" (lunes a viernes de 09:00 a 18:00), así puede entrar a cualquier servicio; 201 con el empleado; 422 si ese email no tiene Usuario (mensaje: todavía no tiene cuenta en Agendic, tiene que registrarse); 409 si ya es empleado activo del negocio |
| DELETE | `/employees/:id` | sí | Da de baja (soft-delete) un empleado (solo el dueño); 422 si es el Dueño dándose de baja a sí mismo |
| GET | `/businesses/:id/employees` | sí | Lista empleados activos de un negocio (solo el dueño) |

- `CreateEmployeeDto`: `{ email }`
- Respuesta (`presentEmployee`): `{ id, userId, name, email }` — vista del dueño; en el array
  `employees` de un Service la vista pública es solo `{ id, name }`.
- Recontratar a alguien dado de baja crea una fila nueva: no hay `PATCH` para reactivarlo.

## Availability (Horas laborables)

Cada Empleado tiene una o más Availability, exactamente una predeterminada. Todo es del Dueño del
Negocio del Empleado: cualquier otro Usuario recibe 403.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/employees/:id/availabilities` | sí | Las Availability del Empleado con sus Franjas |
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
- **Cobertura**: `coveredByEmployeeId` tiene que ser un Empleado activo del mismo Negocio y atender todos los Servicios de quien se ausenta; si no, 422 `La Cobertura tiene que ser un Empleado activo del mismo Negocio` o `La Cobertura tiene que atender todos los Servicios de quien se ausenta`. Activarla reasigna, en la misma transacción, los Turnos `BOOKED` de quien se ausenta en esa fecha a quien cubre; si alguno choca con un Turno ya confirmado de quien cubre, 409 `El cubridor ya tiene un Turno a esa hora` y no se guarda nada. Sacar la Anulación (`DELETE`) no revierte los Turnos ya reasignados

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
  5. Descuenta los Turnos `BOOKED` de ese Empleado que pisen el horario, en cualquiera de sus Servicios
  6. Descarta lo que ya pasó según el reloj del sistema; un día ya pasado no viene
- Respuesta: `{ timeZone, days: [{ date, slots: [ISO instants], reason?, coveredByEmployeeId? }] }`. `reason` solo aparece cuando `slots` está vacío: `NOT_WORKING` (sin Franjas, Anulación de día libre, o nada sobrevive el recorte), `FULLY_BOOKED` (había horarios pero los Turnos o el reloj se los llevaron todos), o `COVERED` (la fecha tiene una Anulación con Cobertura; no se calcula nada más y el día trae además `coveredByEmployeeId`)

## Bookings (Turno)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/bookings` | no | Crea un turno (el cliente reserva un horario); queda `UNVERIFIED` y se envía email de verificación |
| POST | `/bookings/verification` | no | Verifica un turno por token (del link del email); re-chequea todas las reglas, puede devolver 409 si el horario se ocupó mientras tanto |
| GET | `/businesses/:id/bookings` | sí | Lista todos los turnos de un negocio (solo el dueño) |

- `CreateBookingDto`: `{ serviceId, employeeId, startsAt: ISO date-string, clientName, clientEmail }`
- `VerifyBookingDto`: `{ token }`
- Respuesta (`presentBooking`): `{ id, serviceId, employeeId, startsAt, endsAt, status }`
- Respuesta solo-dueño (`presentBookingForOwner`, usada en el listado): agrega `clientName, clientEmail`

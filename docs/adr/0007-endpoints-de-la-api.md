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
| PATCH | `/users/me` | sí | Actualiza name/email (cambiar email vuelve a disparar verificación vía `pendingEmail`) y `slug`, el Enlace de reserva del Usuario (ADR 0021): se pasa a minúsculas, mismo formato que el del Negocio (3-40 caracteres, `^[a-z0-9]+(-[a-z0-9]+)*$`); formato inválido → 400, ya tomado por otro Usuario → 409 `Booking link already in use` (el mismo mensaje que el del Negocio; el front lo muestra bajo el campo). La respuesta de `GET`/`PATCH /users/me` suma `slug`, `null` hasta que lo elige |

- `SignUpDto`: `{ name, email, password (12-72 chars) }`
- `VerifyEmailDto`: `{ email, code }`
- `ResendVerificationDto`: `{ email }`
- `UpdateMeDto`: `{ name?, email? }`
- Respuesta (`presentUser`): `{ id, name, email, pendingEmail? (solo si está seteado), role }`

## Businesses (Negocio)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/businesses` | sí | Crea un negocio junto con su primera sucursal, servicio y empleado (alta todo-en-uno); el Empleado creado es el propio Dueño (su Usuario de Sesión, ADR 0013), y el primer servicio queda atendido por ese Empleado con la Availability predeterminada de su Usuario (ADR 0020), todo en la misma transacción; 409 si el Usuario ya es Dueño de un Negocio (ADR 0012) |
| PATCH | `/businesses/:id` | sí | Actualiza name/description/slug (solo el dueño); cambiar el slug deja de servir el Enlace de reserva anterior |
| GET | `/businesses` | sí | Lista solo los negocios del Dueño de la sesión (0 o 1) |
| GET | `/businesses/:id` | no | Detalle de un negocio |
| GET | `/businesses/by-slug/:slug` | no | Detalle de un negocio por su Enlace de reserva; el slug se compara en minúsculas; 404 si no existe |

- `CreateBusinessDto`: `{ business: { name, description, slug }, branch: { name, address, timeZone, slug? }, service: ServiceFieldsDto }`; `branch` valida sus campos igual que `CreateBranchDto` del endpoint de Sucursales, salvo que su `slug` es opcional: sin él, la primera Sucursal toma el `slug` del Negocio
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

- `CreateBranchDto`: `{ name, address, timeZone, slug }`. La Sucursal no tiene horario de apertura ni de cierre (ADR 0020): los Horarios reservables salen solo de las Availability
- `slug` (tramo de Sucursal del Enlace de reserva, ADR 0014: `/business/<slug del negocio>/<slug de la sucursal>`): mismo formato que el `slug` del Negocio (se pasa a minúsculas, 3-40 caracteres, `^[a-z0-9]+(-[a-z0-9]+)*$`); requerido en creación, opcional en `UpdateBranchDto`; formato inválido → 400; ya usado por otra sucursal del mismo negocio → 409 `Booking link already in use` (dos negocios distintos sí pueden repetirlo)
- `timeZone`: nombre IANA (por ejemplo `America/Argentina/Buenos_Aires`), nunca un offset; requerido en creación, opcional en `UpdateBranchDto`; inválido → 400
- `UpdateBranchDto`: los mismos campos, todos opcionales
- Respuesta (`presentBranch`): `{ id, businessId, name, address, timeZone, slug }`

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
| POST | `/branches/:id/services` | sí | Crea un servicio bajo una sucursal, con asignación inicial de empleados (solo el dueño); cada empleado entra con la Availability predeterminada de su Usuario; 409 si el tramo (`slug`) ya lo usa otro servicio activo de esa sucursal |
| PATCH | `/services/:id` | sí | Actualiza un servicio (solo el dueño), incluidos `slug` y `hidden`; 409 si el tramo ya está en uso en esa sucursal |
| DELETE | `/services/:id` | sí | Da de baja (soft-delete) un servicio (solo el dueño) |
| POST | `/services/:id/employees` | sí | Ofrecer: asigna un empleado a un servicio con una Availability de su Usuario (el dueño, o el propio Empleado); 200 con el servicio; 403 si un Empleado actúa por otro o no es Empleado activo del Negocio; 404 si no existe, o si está oculto y quien llama no es dueño ni lo atiende; 422 `La Availability tiene que ser del mismo Usuario que el Empleado` si la Availability es de otro Usuario, o si el servicio está dado de baja; 409 si ya lo atiende |
| PATCH | `/services/:id/employees/:employeeId` | sí | Cambia la Availability con la que ese empleado atiende el servicio (el dueño, o el propio Empleado); 200 con el servicio; 422 `La Availability tiene que ser del mismo Usuario que el Empleado` si la Availability es de otro Usuario; 404 si ese empleado no atiende el servicio o la Availability no existe; no cancela ni mueve Turnos |
| DELETE | `/services/:id/employees/:employeeId` | sí | Dejar de ofrecer: quita un empleado de un servicio (el dueño, o el propio Empleado); `{ cancelledBookings }` con los Turnos futuros cancelados; 422 `Cannot remove the Service's last Employee` si es el último |
| GET | `/branches/:id/services` | no | Lista servicios activos de una sucursal, sin los ocultos; 404 si la sucursal no existe |
| POST | `/users/me/services` | sí | Crea un Servicio personal del Usuario (ADR 0021): sin Negocio, sin Sucursal y sin Empleados; 404 si la `availabilityId` no existe o no es del Usuario; 409 si el `slug` o el nombre ya lo usa otro Servicio personal activo suyo |
| GET | `/users/me/services` | sí | Los Servicios personales activos del Usuario, ocultos incluidos |
| GET | `/u/:userSlug` | no | El Enlace de reserva del Usuario: `{ name, slug, services }` con sus Servicios personales no ocultos ni dados de baja; el tramo se compara en minúsculas; 404 si ningún Usuario lo tiene |
| GET | `/u/:userSlug/:serviceSlug` | no | Un Servicio personal por su tramo, aunque esté oculto; 404 si el Usuario no existe o ningún Servicio personal suyo no dado de baja tiene ese tramo |
| GET | `/branches/:id/services/by-slug/:slug` | no | Un servicio de la sucursal por su tramo del Enlace de reserva (ADR 0018), aunque esté oculto; el tramo se compara en minúsculas; 404 si la sucursal no existe o si ningún servicio suyo no dado de baja tiene ese tramo |

- `CreateServiceDto`: `{ name, description?, category, durationMinutes (int ≥1), price (number ≥0), depositPercent?, requiresApproval?, slug, hidden?, prepMinutes?, dailyLimit?, slotInterval?, minimumNoticeMinutes?, employeeIds: number[] (no vacío) }`
- `slug` es el tramo del Servicio en el Enlace de reserva (ADR 0018): obligatorio al crear, en minúsculas, mismas reglas que el de Sucursal; único por sucursal entre los servicios no dados de baja (índice parcial, ADR 0004; un tramo de un servicio dado de baja queda libre). `hidden` (por defecto `false`) es el Servicio oculto. El servicio del body de `POST /businesses` también exige `slug` y acepta `hidden`.
- Servicio oculto (`hidden: true`): no sale en `GET /branches/:id/services`, pero `by-slug` lo devuelve y sus Horarios reservables y `POST /bookings` funcionan igual que los de uno visible. Ocultar no es una medida de seguridad, es sacarlo de la vidriera. El front abre la página de la Sucursal con el Servicio ya elegido pidiéndolo por su tramo, y trata el 404 como página no encontrada.
- Respuesta del servicio (`presentService`): suma `slug`, `hidden` y, en cada elemento de `employees`, `availabilityId`: `{ id, name, availabilityId }`. Un Servicio es del Negocio o personal (ADR 0021): en el del Negocio `branchId` es el de su Sucursal y `userId` y `availabilityId` son `null`; en el personal `branchId` es `null`, `userId` es el del Usuario, `availabilityId` es la Availability con la que se atiende (`null` una vez dado de baja) y `employees` es `[]`
- Servicio personal: `CreatePersonalServiceDto` es el de `CreateServiceDto` sin `employeeIds` y con `availabilityId` (obligatoria, una Availability del Usuario). `PATCH /services/:id` y `DELETE /services/:id` los hace el propio Usuario (403 si no es el suyo); `PATCH` acepta además `availabilityId` (404 si no es del Usuario, 422 en un Servicio del Negocio). Ofrecer, cambiar la Availability de un Empleado y dejar de ofrecer dan 422 `A personal Service has no Employees`; un `availabilityId` en el `PATCH` de un Servicio del Negocio da 422 `Only a personal Service has its own Availability`. Aceptar, Rechazar, Cancelar, Reagendar y la Ausencia de un Turno personal las hace el propio Usuario (403 `Only the assigned Employee can act on this Turno` si es otro). Ocultar y Dar de baja funcionan como en el Servicio del Negocio: oculto no sale en `GET /u/:userSlug`, pero se reserva por su propio tramo, y dar de baja cancela sus Turnos futuros. `GET /services/:id/slots` y `POST /bookings` funcionan igual; el `timeZone` es el de su Availability, y en esa zona se arman los días (agrupar por fecha, alinear, contar el Límite diario). `POST /bookings` responde `employeeName` con el nombre del Usuario
- `UpdateServiceDto`: `{ name?, description?, category?, durationMinutes?, price?, depositPercent?, requiresApproval?, slug?, hidden?, prepMinutes?, dailyLimit?, slotInterval?, minimumNoticeMinutes? }`
- `prepMinutes` (Tiempo de preparación): `0`, `5`, `10`, `15`, `30` o `60`; `0` por defecto. Otro valor, o `null` → 400. Cada Turno ocupa la agenda de su Empleado desde `startsAt − prepMinutes` hasta `endsAt`, fijado al reservar: cambiarlo no toca los Turnos ya tomados (ADR 0004).
- `dailyLimit` (Límite diario): entero ≥ 1; sin él, el Servicio no tiene límite (`null` en la respuesta). Cuentan los Turnos `PENDING` y `BOOKED` del Servicio, de todos sus Empleados, cuyo inicio cae en ese día según la zona horaria de la Sucursal. En creación no acepta `null`; en `PATCH`, `dailyLimit: null` lo quita, igual que `depositPercent`. Fuera de rango, con decimales o no numérico → 400.
- `slotInterval` (Intervalo): entero ≥ 1, en minutos; sin él (`null` en la respuesta), los Horarios reservables arrancan cada `durationMinutes`. En creación no acepta `null`; en `PATCH`, `slotInterval: null` lo quita. Otro valor → 400.
- `minimumNoticeMinutes` (Anticipación mínima): entero ≥ 0, en minutos; `0` por defecto. Un Horario reservable arranca como mínimo a `ahora + minimumNoticeMinutes`. Otro valor, o `null` → 400.
- Los cuatro valen también en el `service` de `POST /businesses`, y la respuesta del servicio (`presentService`) los suma: `prepMinutes`, `dailyLimit`, `slotInterval`, `minimumNoticeMinutes`.
- `depositPercent` (Seña): entero de 0 a 100, porcentaje del precio. Es simbólica: se guarda y se
  muestra, no dispara ningún cobro. Sin él, el Servicio no pide Seña (`null` en la respuesta). Fuera
  de 0-100, con decimales o no numérico → 400. En creación no acepta `null`; en `PATCH`,
  `depositPercent: null` le saca la Seña. También vale en el `service` de `POST /businesses`.
- `requiresApproval` (Aprobación manual): booleano, `false` por defecto. Con `true`, los Turnos del Servicio
  no quedan `BOOKED` al verificarse sino `PENDING`, hasta que el Empleado los Acepta o los Rechaza.
  No booleano → 400. También vale en el `service` de `POST /businesses`.
- `AssignEmployeeDto`: `{ employeeId, availabilityId? }`; sin `availabilityId`, el empleado entra con la Availability predeterminada de su Usuario
- `ChangeEmployeeAvailabilityDto`: `{ availabilityId }`; falta o no es entero → 400
- **Quién gestiona los Empleados de un servicio** (ADR 0017): el Dueño, por cualquiera del Staff, o el propio Empleado, cuando `employeeId` es su Empleado activo en el Negocio del servicio. Un Empleado que actúa por otro, uno dado de baja o un Usuario que no es Empleado de ese Negocio recibe 403 `Only the Dueño or that same Empleado can do this`. El front muestra tal cual el `message` del 422 del último Empleado e informa `cancelledBookings` al dejar de ofrecer.
- Cada empleado atiende el servicio con una Availability de su Usuario. Es una referencia: editar esa
  Availability (`PUT /availabilities/:id`) cambia en el acto todos los servicios que la usan. La
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
| POST | `/invitations/:id/accept` | sí | Aceptar invitación (ADR 0019): crea el Empleado del Negocio y cierra la Invitación; 200 con el empleado; puede aceptar aunque sea Dueño de otro Negocio; 404 si no existe o no es de su email; 422 "La invitación venció"; 422 "ya es Empleado" (también al aceptar dos veces) |
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

La Availability es del Usuario (ADR 0020, 0021): todo Usuario nace con una, "Horas laborables" (lunes a
viernes de 09:00 a 17:00, `America/Argentina/Buenos_Aires`, predeterminada), creada en la misma
transacción que el Usuario. Todos los endpoints exigen Sesión y valen solo sobre las Availability
propias: la de otro Usuario es 404, como una que no existe.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/availabilities` | sí | Las Availability del Usuario: `[{ id, name, isDefault, timeZone }]` |
| POST | `/availabilities` | sí | Crea una vacía, no predeterminada; 201 con la Availability |
| GET | `/availabilities/:id` | sí | La Availability con su matriz semanal y sus Anulaciones |
| PUT | `/availabilities/:id` | sí | Reemplaza todo: nombre, zona, Franjas y Anulaciones, en una transacción; 200 con la Availability |
| PATCH | `/availabilities/:id/default` | sí | La marca predeterminada y desmarca la anterior; 200 con la Availability |
| DELETE | `/availabilities/:id` | sí | La borra con sus Franjas y Anulaciones; 204 |

- `CreateAvailabilityDto`: `{ name, timeZone }`
- Respuesta de `GET /availabilities/:id` (`presentAvailability`): `{ id, name, isDefault, timeZone, schedule: TimeRange[7][], overrides: [{ date: "YYYY-MM-DD", ranges: TimeRange[] }] }`, con `TimeRange = { start: "HH:mm", end: "HH:mm" }`. `schedule[0]` es el domingo … `schedule[6]` el sábado (igual que `dayjs().day()`); un día sin rangos es un día que no se trabaja. En `overrides`, `ranges: []` es día libre; van ordenadas por fecha. La Franja y la Anulación se leen en `timeZone`.
- `UpdateAvailabilityDto` (`PUT`): el mismo cuerpo sin `id`, `{ name, timeZone, schedule, overrides }`. `isDefault` se acepta y se ignora (se cambia con `PATCH .../default`). Reemplaza todas las Franjas y Anulaciones. El back guarda la matriz agrupada: los rangos con igual inicio y fin son una sola Franja con varios `days` (`AvailabilityInterval.days`), así que el GET devuelve la misma matriz que se mandó.
- Errores (el front muestra el `message` tal cual):
  - `schedule` que no tiene 7 días, hora que no es `HH:mm`, fecha que no es `YYYY-MM-DD`, campo extra → 400
  - un rango con `end <= start` → 422 `El miércoles: el rango 17:00–09:00 tiene que terminar después de empezar` (o `La fecha 2026-02-10: …`)
  - dos rangos del mismo día que se pisan → 422 `El viernes: el rango 12:00–17:00 se solapa con otro` (o `La fecha …`); dos que se tocan (09:00–17:00 y 17:00–18:00) se aceptan
  - dos Anulaciones de la misma fecha → 422 `La fecha 2026-02-10 está repetida`
  - `timeZone` que no es un nombre IANA (por ejemplo un offset `-03:00`) → 422 `La zona horaria … no es una zona IANA válida`, también al crear
  - borrar la predeterminada → 422 `No se puede borrar la Availability predeterminada`
  - borrar una que usa algún servicio → 422 `No se puede borrar la Availability: la usan 2 Servicios` (o `la usa 1 Servicio`). Un servicio dado de baja ya no la usa. Si un Servicio la toma justo mientras se borra → 409
  - Availability inexistente o de otro Usuario → 404
  - dos pedidos concurrentes que dejarían dos predeterminadas → 409
- Las Anulaciones no tienen endpoints propios (se van `GET/PUT/DELETE /employees/:id/overrides…`): viajan dentro de la Availability. La Cobertura desaparece (ADR 0021).

## Slots (Horario reservable)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/services/:id/slots` | no | Los Horarios reservables de un Servicio, día por día, en un rango de fechas: la unión de los de cada Empleado que lo Ofrece (ADR 0021) |

- Query: `from`/`to` (`YYYY-MM-DD`, fechas locales de la Sucursal, inclusive, requeridos); falta alguno o formato inválido → 400
- Rango de hasta 31 días; más, o `to` anterior a `from` → 422
- Servicio inexistente o dado de baja → 404
- Cada Empleado activo que Ofrece el Servicio aporta sus Horarios reservables, calculados con su propia Availability y su propia ocupación (por Usuario); el Cliente no elige Empleado. El Límite diario se cuenta sumando a todos
- Algoritmo de cal.diy, con dayjs (`utc` y `timezone`); la respuesta trae instantes UTC:
  1. Rangos por día: las Franjas de la Availability con la que ese Empleado atiende ese Servicio, leídas en la zona de la Availability, pasan a rangos concretos (el horario de verano lo resuelve dayjs). Una Franja que termina a las 23:59 llega hasta la medianoche
  2. Una Anulación de esa fecha de la Availability (en su zona) reemplaza esas Franjas por completo (día sin horas = día libre)
  3. Se restan, como rangos, los Turnos `PENDING` y `BOOKED` de ese Empleado (un Turno pendiente ocupa su horario igual que uno aceptado), en cualquiera de sus Servicios y Negocios, cada uno desde su propia preparación (`prepStartsAt`) hasta su fin. Con `excludeBookingId` el Turno que se está Reagendando queda libre
  4. Cada rango se corta: la frecuencia es el Intervalo (`slotInterval`) o, sin él, la duración. La alineación es el mayor de 60, 30, 20, 15, 10 y 5 que divida la frecuencia (1 si ninguno). El inicio de cada rango es el máximo entre su inicio más el Tiempo de preparación del Servicio y `ahora + minimumNoticeMinutes`, redondeado hacia arriba a la alineación en la zona de la Sucursal. Se avanza de a la frecuencia mientras `inicio + duración ≤ fin del rango`, sin repetir instantes
  5. Los horarios se agrupan por fecha de la Sucursal (su zona, no la de la Availability). Si el Servicio tiene `dailyLimit` y ese día de la Sucursal ya tiene esa cantidad de Turnos `PENDING` o `BOOKED` del Servicio, el día no ofrece horarios (`reason: FULLY_BOOKED`)
  6. Un día ya pasado no viene
- No se copian de cal.diy `showOptimizedSlots`, `offsetStart`, asientos, `travelSchedules` ni OOO
- Respuesta: `{ timeZone, days: [{ date, slots: [ISO instants], reason? }] }`, con `timeZone` la de la Sucursal (en la que están las fechas `date`). `reason` solo aparece cuando `slots` está vacío: `NOT_WORKING` (ninguna Franja del día alcanza para la duración del Servicio, o Anulación de día libre) o `FULLY_BOOKED` (había horarios pero los Turnos, la Anticipación mínima o el Límite diario se los llevaron todos)

## Bookings (Turno)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/bookings/code` | no | Pide un Código de verificación para un email, mandado por mail; 204 |
| POST | `/bookings` | no | Crea un turno con el Código de verificación de `clientEmail` ya validado; queda `BOOKED`, o `PENDING` si el Servicio tiene `requiresApproval` (ADR 0022) |
| PATCH | `/bookings/:id/accept` | sí | Acepta un Turno pendiente: `PENDING` → `BOOKED` (solo el Empleado asignado) |
| PATCH | `/bookings/:id/reject` | sí | Rechaza un Turno pendiente: `PENDING` → `REJECTED`, libera el horario (solo el Empleado asignado) |
| PATCH | `/bookings/:id/cancel` | sí | Cancela un Turno aceptado: `BOOKED` → `CANCELLED`, libera el horario (solo el Empleado asignado) |
| PATCH | `/bookings/:id/reschedule` | sí | Reagenda un Turno aceptado a otro Horario reservable del mismo Servicio y Empleado; sigue `BOOKED` y no repite la Verificación de email (solo el Empleado asignado) |
| PATCH | `/bookings/:id/no-show` | sí | Marca la Ausencia de un Turno aceptado cuyo horario ya pasó: guarda `noShowAt` con la hora actual, sin cambiar `status` (solo el Empleado asignado) |
| GET | `/businesses/:id/bookings` | sí | Lista todos los turnos de un negocio (solo el dueño) |
| GET | `/booking-links/:secret` | no | Enlace del Turno: abre ese Turno solo, en cualquier estado (ADR 0022) |
| PATCH | `/booking-links/:secret/cancel` | no | Cancela ese Turno, si está pendiente o aceptado y no empezó |
| PATCH | `/booking-links/:secret/reschedule` | no | Reagenda ese Turno a otro Horario reservable del mismo Servicio |

- **Código de verificación** (ADR 0022, reemplaza al flujo por link del ADR 0005/0006 para el Turno): Reservar exige un Código de verificación vigente para `clientEmail`. `RequestBookingCodeDto`: `{ email }` (se recorta y pasa a minúsculas). `POST /bookings/code` manda un TOTP sin estado atado al email, ventana de 15 minutos, 6 caracteres del alfabeto del ADR 0006 (A-Z y 2-9, sin `0/O` ni `1/I`); no se guarda nada por código pedido. 400 si `email` es inválido. 429 `Too many verification codes requested for <email>` al sexto pedido para ese email en 15 minutos.
- `CreateBookingDto`: `{ serviceId, startsAt: ISO date-string, clientName, clientEmail, notes?, code }`; el Cliente no manda Empleado, el back le asigna uno. Falta `code` → 400; no valida para `clientEmail` en su ventana → 400 `Invalid or expired verification code for <email>`, y no crea nada.
- `notes` (Comentario del Turno): texto libre, se recorta; hasta 500 caracteres. Vacío o solo espacios se guarda como sin Comentario (`null`). Más largo, no string o `null` → 400. No se valida el contenido
- Respuesta (`presentBooking`): `{ id, serviceId, employeeId, startsAt, endsAt, status, notes }` (`employeeId` es `null` en un Turno de un Servicio personal, que atiende el propio Usuario; la ocupación es por Usuario, así que un Turno personal bloquea ese tramo en sus Servicios del Negocio y al revés, ADR 0021); `notes` es `null` si el Cliente no dejó Comentario del Turno. `POST /bookings` agrega `employeeName`, el nombre del Empleado asignado, y `link`, el secreto del Enlace del Turno, para que el front lleve al Cliente a ese Turno apenas Reserva (ver más abajo)
- **Asignación** (ROUND_ROBIN de cal.diy, ADR 0021): entre los Empleados libres en ese horario, `POST /bookings` asigna el que hace más tiempo que no recibe un Turno `PENDING` o `BOOKED` de ese Servicio (por `createdAt`); sin Turnos previos, gana ese; si empatan, el de menor id. Con Aprobación manual el Turno queda `PENDING` para el asignado
- Respuesta solo-dueño (`presentBookingForOwner`, usada en el listado): agrega `clientName, clientEmail`
- **Ciclo de vida** (ADR 0022): no existe el Turno sin verificar. `POST /bookings`, con el código ya validado, crea
  directamente `BOOKED`, o `PENDING` si el Servicio tiene Aprobación manual; de `PENDING`, Aceptar → `BOOKED` y
  Rechazar → `REJECTED`.
- **Aceptar / Rechazar**: exigen Sesión y que el usuario sea el Empleado asignado al Turno (403 `Only the assigned Employee can accept or reject this Turno` si no; 404 si el Turno no existe). Un Turno que no
  está `PENDING` da 422 `Turno is not pending`. Responden el Turno (`presentBooking`).
- **Cancelar / Reagendar / Ausencia** (`/bookings/:id/...`, del Empleado): exigen Sesión y ser el Empleado asignado al Turno (403 `Only the assigned Employee can act on this Turno`; 404 si el Turno no existe). Un Turno que no está `BOOKED` da 422 `Turno is not booked`. Responden el Turno (`presentBooking`); Ausencia le suma `noShowAt`. No cambian con el ADR 0022: solo valen sobre un Turno ya aceptado.
  - `RescheduleBookingDto`: `{ startsAt: ISO date-string }`; la duración se conserva, y la preparación es la que el Servicio tiene hoy. Un día que ya alcanzó el Límite diario no ofrece Horarios reservables, así que mover un Turno ahí es el mismo 422 (sin contar al propio Turno). `startsAt` inválido → 400. Si no es un Horario reservable de ningún Empleado según el mismo cálculo que `GET /services/:id/slots` → 422 `Slot <ISO> is not available for Service <id>`. El horario que el Turno ya ocupaba cuenta como libre. Si el Empleado asignado está libre en el horario nuevo se queda con el Turno; si no, pasa a otro libre (el de la regla de Asignación) y `employeeId` de la respuesta cambia.
  - Ausencia: 422 si el Turno no terminó todavía (`Turno has not ended yet`) o ya tiene Ausencia (`Turno already has an Ausencia`).
- **Enlace del Turno** (ADR 0022): cada Turno tiene un identificador secreto, único y no adivinable (`link`, 256 bits, apto para URL), generado al crear. Solo sale en la respuesta de `POST /bookings`, que ya validó el Código de verificación de `clientEmail`. `POST /bookings` manda la Confirmación de reserva al Cliente con el link `<URL del front>/turnos/<link>`. Es la única forma que tiene el Cliente de volver a su Turno: no hay listado de Turnos por email.
  - `GET /booking-links/:secret`: sin Sesión. Responde el Turno en cualquier estado (`presentClientBooking`): `{ id, status, startsAt, endsAt, timeZone, notes, clientName, serviceId, employeeId, service: { name, durationMinutes, price, depositPercent }, employeeName, business: { name, slug } | null, branch: { name, slug, address, coverUrl } | null, user: { slug } | null }`. `business` y `branch` son `null` en un Servicio personal, y `user` es `null` en un Servicio del Negocio: con ellos el front arma el Enlace de reserva de la Sucursal (`/business/<business.slug>/<branch.slug>`) o del Usuario (`/u/<user.slug>`) para "Reservar de nuevo". `timeZone` es la de la Sucursal, o la de la Availability en un Servicio personal; `coverUrl` es la primera Imagen de Sucursal por `order`, o `null` si no tiene ninguna. 404 `Turno not found` si el Enlace no corresponde a ningún Turno.
  - `PATCH /booking-links/:secret/cancel` y `.../reschedule`: a diferencia del Cancelar/Reagendar del Empleado, valen sobre un Turno `PENDING` o `BOOKED` (no solo `BOOKED`); uno que no está `PENDING` ni `BOOKED` da 422 `Turno is not pending or booked`. Responden el Turno con la misma forma que `GET /booking-links/:secret`. 404 `Turno not found` para un Enlace desconocido.
  - Cancelar: además, 422 `Turno <id> already started` si su horario ya empezó.
  - Reagendar: `RescheduleBookingDto`, mismas reglas que el del Empleado (409 `Overlaps a booked Turno for this Employee`, 422 `Slot <ISO> is not available for Service <id>`, 400 `startsAt` inválido), con una diferencia: si el Servicio tiene Aprobación manual, el Turno queda (o vuelve a quedar) `PENDING`, sea cual sea su estado antes de Reagendar.
- **Horario ocupado (409 `Overlaps a booked Turno for this Employee`)**. Como el Turno nace ya `BOOKED` o
  `PENDING`, la creación misma es la que puede chocar:
  - `POST /bookings` → 422 `Slot <ISO> is not available for Service <id>` si `startsAt` no está entre los Horarios reservables que `GET /services/:id/slots` calcula en ese momento para algún Empleado (nadie libre, fuera de las Franjas, fuera de la grilla del Intervalo, antes de la Anticipación mínima). El front lo muestra como «ese horario ya no está disponible» y vuelve a pedir la lista.
  - Dos `POST /bookings` casi juntos para el mismo horario: uno da 201, el otro 409 `Overlaps a booked Turno for this Employee`. Lo garantiza la exclusion constraint `Booking_no_overlap` de Postgres (ADR 0004), no solo el chequeo del caso de uso.
  - `POST /bookings` → 409 `The Service reached its Límite diario that day` si el Servicio ya tiene `dailyLimit` Turnos `PENDING` o `BOOKED` ese día de la Sucursal. Dos creaciones casi juntas del mismo Servicio no pueden pasarlo: la creación cuenta y crea dentro de una transacción con `pg_advisory_xact_lock` por Servicio (ADR 0004).

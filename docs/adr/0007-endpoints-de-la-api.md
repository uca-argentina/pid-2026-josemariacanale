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
  409, `Expired` → 410, `BusinessRule` → 422, `NotConfigured` → 503, resto → 500.
- CORS habilitado para todos los orígenes.
- Un Usuario dado de baja (ADR 0024) que todavía tiene una Sesión abierta recibe **403** `User <id> is dado de baja` en cualquier endpoint con Sesión. La única excepción es `DELETE /users/me`. El front cierra la Sesión al verlo.

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
| GET | `/users/me` | sí | Perfil del usuario actual, con `slug`, `timeFormat` y `weekStart` (ver `PATCH`) |
| GET | `/users/me/bookings` | sí | Mis turnos (ADR 0023): todos los Turnos, en cualquier estado, salvo los originales reagendados (ADR 0031), que atiende el Usuario de la Sesión: los de sus Servicios personales y los de los Negocios donde es Empleado activo; lista vacía (200) si no tiene ninguno |
| PATCH | `/users/me` | sí | Actualiza name/email (cambiar email vuelve a disparar verificación vía `pendingEmail`) y `slug`, el Enlace de reserva del Usuario (ADR 0021): se pasa a minúsculas, mismo formato que el del Negocio (3-40 caracteres, `^[a-z0-9]+(-[a-z0-9]+)*$`); formato inválido → 400, ya tomado por otro Usuario o por un Negocio, aunque esté dado de baja, o una palabra reservada → 409 `Booking link already in use` (el mismo mensaje que el del Negocio; el front lo muestra bajo el campo; ADR 0026). La respuesta de `GET`/`PATCH /users/me` suma `slug`, `null` hasta que lo elige, y las preferencias del panel `timeFormat` (`12 \| 24`, por defecto 24) y `weekStart` (`0..6`, 0 = domingo como `dayjs().day()`, por defecto 1, lunes); `PATCH` acepta ambas, juntas o por separado: `timeFormat` que no sea 12 ni 24, o `weekStart` que no sea un entero de 0 a 6 → 400. Nunca afectan la página donde el Cliente Reserva |
| DELETE | `/users/me` | sí | Dar de baja al propio Usuario (ADR 0024): marca `deletedAt`, da de baja sus Servicios personales y sus Empleados (aunque sea el último Empleado de un Servicio) y cancela sus Turnos futuros pendientes y aceptados. Si es Dueño, además marca `Business.deletedAt`, da de baja todos los Servicios de sus Sucursales y todos los Empleados del Negocio, cancela los Turnos futuros pendientes y aceptados de esos Servicios y cierra las Invitaciones abiertas (las Sucursales y sus imágenes quedan como historial). Todo en una transacción; después lo borra en Clerk. **204** sin body, también si ya estaba dado de baja y esta vez Clerk respondió bien (idempotente; que Clerk ya no lo tenga no es error); **502** `No se pudo borrar el Usuario en el Proveedor de autenticación` si Clerk falló (la fila ya quedó dada de baja; repetir el `DELETE` reintenta); ya no hay 422 para el Dueño. El front muestra el 502 y deja reintentar. Le manda el Aviso de cambio del Turno al Cliente por mail; si el mail falla, igual responde OK. |

- Respuesta de `GET /users/me/bookings` (`presentUserBooking`), un elemento por Turno, del más próximo al más lejano: `{ id, employeeId, status, startsAt, endsAt, clientName, clientEmail, noShowAt, employeeNoShowAt, employeeChosen, fromRescheduleId, depositAmount, depositPaidAt, serviceId, serviceName, cabin: { id, name } | null, business: { id, name } | null, branch: { id, name } | null }`; `employeeId`, `business` y `branch` son `null` en un Servicio personal; `noShowAt` es `null` mientras el Turno no tiene Ausencia del Invitado; `employeeNoShowAt` es `null` mientras el Turno no tiene Ausencia del Anfitrión (ISO); `fromRescheduleId` es el `id` del Turno original al que este reemplazó al Reagendar (`null` si no nació de un Reagendar; ADR 0031); `employeeChosen` es `true` si el Cliente Reservó por el Enlace de reserva del Empleado (Empleado elegido, ADR 0026); `depositAmount` es el monto de la Seña (`number`, `null` si el Turno no tiene Seña) y `depositPaidAt` cuándo se pagó (ISO, `null` mientras no se paga)
- `SignUpDto`: `{ name, email, password (12-72 chars) }`
- `VerifyEmailDto`: `{ email, code }`
- `ResendVerificationDto`: `{ email }`
- `UpdateMeDto`: `{ name?, email? }`
- Respuesta (`presentUser`): `{ id, name, email, pendingEmail? (solo si está seteado), role }`. Suma `imageUrl: string | null`: la foto de perfil, la de Clerk al crearse el Usuario; `null` sin una foto real o con una URL que no se pudo parsear. Se refresca en cada request desde los claims `imageUrl` / `hasImage` del session token (como el nombre y el email, ADR 0009): sin los claims no se toca; si Clerk dice que no hay foto real pasa a `null`; si no cambió no se escribe; una falla al refrescar no tumba el request.

## Businesses (Negocio)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/businesses` | sí | Crea un negocio junto con su primera sucursal y su empleado, y opcionalmente su primer servicio; el Empleado creado es el propio Dueño (su Usuario de Sesión, ADR 0013), y el primer servicio, si viene, queda atendido por ese Empleado con la Availability predeterminada de su Usuario (ADR 0020), todo en la misma transacción; sin `service`, la respuesta trae `service: null`; las imágenes de la primera Sucursal llegan en el mismo pedido, en `multipart/form-data`; 409 si el Usuario ya es Dueño de un Negocio (ADR 0012) |
| PATCH | `/businesses/:id` | sí | Actualiza name/description/slug (solo el dueño); cambiar el slug deja de servir el Enlace de reserva anterior |
| PUT | `/businesses/:id/logo` | sí | Pone o reemplaza el Logo del Negocio (solo el Dueño; otro Usuario 403, Negocio inexistente o dado de baja 404). `multipart/form-data` con la imagen en `file`, mismas validaciones que `POST /branches/:id/images`: sin archivo 400 `file is required`, tipo que no es JPEG/PNG/WebP/GIF 400 `La imagen tiene que ser JPEG, PNG, WebP o GIF`, más de 5 MB 413. Borra el archivo del Logo anterior (si ese borrado falla, la operación igual sale bien). 200 con el Negocio |
| DELETE | `/businesses/:id/logo` | sí | Saca el Logo y borra su archivo (solo el Dueño); 204, también si no tenía Logo o si el archivo no se pudo borrar |
| GET | `/businesses` | sí | Lista solo los negocios del Dueño de la sesión (0 o 1) |
| GET | `/businesses/:id` | no | Detalle de un negocio |
| GET | `/slugs/:slug` | no | De quién es el primer tramo de un Enlace de reserva, sin prefijo (ADR 0026): `200 { kind: 'business', business }` con la forma de `GET /businesses/by-slug/:slug`, o `200 { kind: 'user', user: { name, slug, imageUrl, services } }` con la de `GET /u/:userSlug`; el slug se compara en minúsculas; 404 `Booking link <slug> not found` si nadie lo tiene, si es de un Negocio o Usuario dado de baja, o si no tiene formato de slug. El front resuelve el primer tramo de cada URL pública con esta llamada |
| GET | `/businesses/by-slug/:slug` | no | Detalle de un negocio por su Enlace de reserva; el slug se compara en minúsculas; 404 si no existe o si el Negocio está dado de baja (ADR 0024; su slug no se libera, otro Negocio no puede tomarlo: 409) |

- POST: `multipart/form-data`, con la misma forma que el alta de Sucursal. El campo `data` lleva el `CreateBusinessDto` como JSON string, con la misma validación que un body JSON: falta `data`, JSON inválido, que no es un objeto o que no pasa el DTO → 400. El campo `images` lleva de 1 a 5 archivos, las imágenes de la primera Sucursal, con las mismas validaciones que `POST /branches/:id/images`: tipo que no es JPEG, PNG, WebP o GIF → 400 `La imagen tiene que ser JPEG, PNG, WebP o GIF`; más de 5 MB → 413. Sin archivos → 400 `At least one image is required`; más de 5 → 400 `Unexpected field - images`. Ningún 400/413 crea nada ni sube archivos, y tampoco se sube nada si el Usuario ya es Dueño o el Enlace de reserva es una palabra reservada. Las imágenes quedan en la primera Sucursal (con `order` según el orden recibido) en la misma transacción que crea Negocio, Sucursal, Servicio y Empleado; si una subida o el alta fallan (por ejemplo el 409 de Enlace de reserva en uso), los archivos ya subidos se borran. El Logo sigue subiéndose aparte con `PUT /businesses/:id/logo`
- `CreateBusinessDto`: `{ business: { name, description, slug }, branch: { name, address, timeZone, slug }, service?: ServiceFieldsDto }`; `service` es opcional; `branch` valida sus campos igual que `CreateBranchDto` del endpoint de Sucursales, `slug` incluido: es requerido y sin él es 400 (antes, sin él la primera Sucursal tomaba el `slug` del Negocio y el Enlace de reserva quedaba `/x/x`)
- `UpdateBusinessDto`: `{ name?, description?, slug? }`
- `slug` (Enlace de reserva): se pasa a minúsculas, 3-40 caracteres, palabras de letras y dígitos unidas por guiones (`^[a-z0-9]+(-[a-z0-9]+)*$`); formato inválido → 400, slug ya tomado por otro Negocio o por un Usuario (aunque esté dado de baja) o palabra reservada (`bookings, services, business, availability, analytics, turnos, sign-in, sign-up, api, trpc, u`) → 409 `Booking link already in use` (ADR 0026); `POST /businesses` y `PATCH /businesses/:id` comparten esa regla
- Respuesta (`presentBusiness`): `{ id, name, description, slug, ownerId }`
- Respuesta del POST: `{ business, branch, service, employee, images }` (cada uno con su propio presenter; `images` es la lista de imágenes de la primera Sucursal con `presentBranchImage`, en orden)

## Branches (Sucursal)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/businesses/:businessId/branches` | sí | Crea una sucursal bajo un negocio (solo el dueño) junto con sus imágenes, en `multipart/form-data`; 201 con la Sucursal e `images`; 409 si su `slug` ya está en uso en ese negocio |
| PATCH | `/branches/:id` | sí | Actualiza una sucursal (solo el dueño); 409 si su `slug` ya está en uso en ese negocio; cambiar el `slug` deja de servir el Enlace de reserva anterior de esa sucursal |
| GET | `/businesses/:businessId/branches` | no | Lista sucursales de un negocio |

- POST: `multipart/form-data`, para que la Sucursal nunca nazca sin imagen. El campo `data` lleva el `CreateBranchDto` como JSON string, con la misma validación que un body JSON: falta `data`, JSON inválido, que no es un objeto o que no pasa el DTO → 400. El campo `images` lleva de 1 a 5 archivos, con las mismas validaciones que `POST /branches/:id/images`: tipo que no es JPEG, PNG, WebP o GIF → 400 `La imagen tiene que ser JPEG, PNG, WebP o GIF`; más de 5 MB → 413. Sin archivos → 400 `At least one image is required`; más de 5 → 400 `Unexpected field - images`. Ningún 400/413 crea nada ni sube archivos. La Sucursal y sus imágenes (con `order` según el orden recibido) se crean en la misma transacción; si una subida o el alta fallan (por ejemplo el 409 de `slug`), los archivos ya subidos se borran
- `CreateBranchDto`: `{ name, address, timeZone, slug, description? }`. La Sucursal no tiene horario de apertura ni de cierre (ADR 0020): los Horarios reservables salen solo de las Availability
- `slug` (tramo de Sucursal del Enlace de reserva, ADR 0014: `/<slug del negocio>/<slug de la sucursal>`): mismo formato que el `slug` del Negocio (se pasa a minúsculas, 3-40 caracteres, `^[a-z0-9]+(-[a-z0-9]+)*$`); requerido en creación, opcional en `UpdateBranchDto`; formato inválido → 400; ya usado por otra sucursal del mismo negocio → 409 `Booking link already in use` (dos negocios distintos sí pueden repetirlo)
- `timeZone`: nombre IANA (por ejemplo `America/Argentina/Buenos_Aires`), nunca un offset; requerido en creación, opcional en `UpdateBranchDto`; inválido → 400
- `description`: texto libre opcional de la Sucursal, que en su página pública reemplaza al del Negocio; un string vacío (o en blanco) se guarda como `null`. También vale en el `branch` de `POST /businesses`. En `UpdateBranchDto`, `description: null` la quita
- `UpdateBranchDto`: los mismos campos, todos opcionales
- Respuesta (`presentBranch`): `{ id, businessId, name, address, timeZone, slug, description }` (`description: string | null`). El POST suma `images`: la lista de imágenes de la Sucursal con `presentBranchImage` (`{ id, branchId, url, order }`), en orden

## Imágenes de Sucursal (BranchImage)

Los archivos viven en el storage externo (ADR 0015); cada imagen es una URL pública. Listarlas es
público; subir, borrar y ordenar es solo del Dueño del Negocio de la Sucursal: cualquier otro
Usuario recibe 403. Las filas se borran en cascada con la Sucursal (hoy no hay endpoint que borre
una Sucursal); sus archivos en el storage no.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/branches/:id/images` | no | Las imágenes de la Sucursal, ordenadas por `order`; 404 si la Sucursal no existe |
| POST | `/branches/:id/images` | sí | Sube una imagen y la agrega al final; 201 con la imagen; 422 `La Sucursal ya tiene 5 imágenes` si ya tiene cinco (el conteo y el alta van en la misma transacción, y el archivo subido se borra) |
| DELETE | `/branches/:id/images/:imageId` | sí | Borra la imagen y su archivo; 204; 409 `Branch <id> must keep at least one image` si es la única imagen de la Sucursal (el conteo y el borrado van en la misma transacción, y no se borra ni la fila ni el archivo) |
| PUT | `/branches/:id/images/order` | sí | Reemplaza el orden de todas las imágenes; 200 con la lista ya ordenada |

- POST: `multipart/form-data` con la imagen en el campo `file`. Sin archivo → 400 `file is required`; tipo que no es `image/jpeg`, `image/png`, `image/webp` o `image/gif` → 400 `La imagen tiene que ser JPEG, PNG, WebP o GIF`; más de 5 MB → 413
- `ReorderBranchImagesDto`: `{ imageIds: number[] }`, la lista completa de imágenes de la Sucursal en el orden deseado (mismo criterio de reemplazo total que `PUT /employees/:id/overrides/:date`). Falta `imageIds`, id repetido o que no es entero → 400; algún id que no es una imagen de esa Sucursal → 404; lista que deja afuera alguna → 422 `El orden tiene que incluir todas las imágenes de la Sucursal`
- DELETE de una imagen que no es de esa Sucursal (o no existe) → 404; si el archivo no se puede borrar del storage igual responde 204 (queda un archivo sin uso, nunca una imagen rota)
- Respuesta (`presentBranchImage`): `{ id, branchId, url, order }`. `order` es ascendente pero no necesariamente contiguo (borrar deja huecos); el front ordena por él, no lo usa como índice

## Cabins (Cabina)

Todos exigen Sesión y solo los hace el Dueño del Negocio de la Sucursal (ADR 0030): cualquier otro Usuario recibe 403. Un Negocio dado de baja responde como inexistente (404, ADR 0024). La Cabina no sale en ningún endpoint público.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/branches/:id/cabins` | sí | Las Cabinas activas de la Sucursal, ordenadas por nombre; 404 si la Sucursal no existe |
| POST | `/branches/:id/cabins` | sí | Crea una Cabina; 201 con la Cabina; 404 si la Sucursal no existe; 409 `Cabin name <name> already in use in Branch <branchId>` |
| PATCH | `/cabins/:id` | sí | Renombra una Cabina; 200 con la Cabina; mismo 409; 404 si no existe o está dada de baja |
| DELETE | `/cabins/:id` | sí | Da de baja la Cabina (marca `deletedAt`); 204; 404 si no existe o ya está dada de baja; 409 `Cabin <id> has <n> upcoming Turnos` si tiene Turnos `PENDING` o `BOOKED` con `endsAt` posterior a ahora (`<n>` es cuántos): primero se Reagendan o se Cancelan. Los Turnos pasados, cancelados o rechazados no cuentan |

- `CabinNameDto` (POST y PATCH): `{ name }`. Se guarda recortado; falta, queda vacío después de recortarlo, no es un string o tiene más de 60 caracteres → 400
- El nombre es único por Sucursal entre las activas, sin distinguir mayúsculas (`name` en el 409 es el que mandó el cliente); se puede repetir en otra Sucursal y reusar el de una Cabina dada de baja. Renombrar una Cabina a su mismo nombre con otras mayúsculas es válido
- Respuesta (`presentCabin`): `{ id, branchId, name }`
- El 409 de `DELETE` no se parece al de la baja de lo demás, que cancela los Turnos futuros (ADR 0030); el front lo muestra en la pantalla de Sucursales

## Services (Servicio)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/branches/:id/services` | sí | Crea un servicio bajo una sucursal, con asignación inicial de empleados (solo el dueño); cada empleado entra con la Availability predeterminada de su Usuario; 409 si el tramo (`slug`) ya lo usa otro servicio activo de esa sucursal |
| PATCH | `/services/:id` | sí | Actualiza un servicio (solo el dueño), incluidos `slug` y `hidden`; 409 si el tramo ya está en uso en esa sucursal |
| DELETE | `/services/:id` | sí | Da de baja (soft-delete) un servicio (solo el dueño). Le manda el Aviso de cambio del Turno al Cliente por mail; si el mail falla, igual responde OK. |
| POST | `/services/:id/employees` | sí | Ofrecer: asigna un empleado a un servicio con una Availability de su Usuario (el dueño, o el propio Empleado); 200 con el servicio; 403 si un Empleado actúa por otro o no es Empleado activo del Negocio; 404 si no existe, o si está oculto y quien llama no es dueño ni lo atiende; 422 `La Availability tiene que ser del mismo Usuario que el Empleado` si la Availability es de otro Usuario, o si el servicio está dado de baja; 409 si ya lo atiende |
| PATCH | `/services/:id/employees/:employeeId` | sí | Cambia la Availability con la que ese empleado atiende el servicio (el dueño, o el propio Empleado); 200 con el servicio; 422 `La Availability tiene que ser del mismo Usuario que el Empleado` si la Availability es de otro Usuario; 404 si ese empleado no atiende el servicio o la Availability no existe; no cancela ni mueve Turnos |
| DELETE | `/services/:id/employees/:employeeId` | sí | Dejar de ofrecer: quita un empleado de un servicio (el dueño, o el propio Empleado); `{ cancelledBookings }` con los Turnos futuros cancelados; 422 `Cannot remove the Service's last Employee` si es el último. Le manda el Aviso de cambio del Turno al Cliente por mail; si el mail falla, igual responde OK. |
| GET | `/branches/:id/services` | no | Lista servicios activos de una sucursal, sin los ocultos; 404 si la sucursal no existe |
| POST | `/users/me/services` | sí | Crea un Servicio personal del Usuario (ADR 0021): sin Negocio, sin Sucursal y sin Empleados; 404 si la `availabilityId` no existe o no es del Usuario; 409 si el `slug` o el nombre ya lo usa otro Servicio personal activo suyo |
| GET | `/users/me/services` | sí | Los Servicios personales activos del Usuario, ocultos incluidos |
| GET | `/u/:userSlug` | no | El Enlace de reserva del Usuario: `{ name, slug, imageUrl, services }` con `imageUrl` la foto de perfil del Usuario (`User.imageUrl`), `null` si no tiene una real en el Proveedor de autenticación, y sus Servicios personales no ocultos ni dados de baja; el tramo se compara en minúsculas; 404 si ningún Usuario lo tiene |
| GET | `/u/:userSlug/:serviceSlug` | no | Un Servicio personal por su tramo, aunque esté oculto; 404 si el Usuario no existe o ningún Servicio personal suyo no dado de baja tiene ese tramo |
| GET | `/branches/:id/services/by-slug/:slug` | no | Un servicio de la sucursal por su tramo del Enlace de reserva (ADR 0018), aunque esté oculto; el tramo se compara en minúsculas; 404 si la sucursal no existe o si ningún servicio suyo no dado de baja tiene ese tramo (los de un Negocio dado de baja están todos dados de baja) |

- `CreateServiceDto`: `{ name, description?, category, durationMinutes (int ≥1), price (number ≥0), depositPercent?, requiresApproval?, slug, hidden?, prepMinutes?, dailyLimit?, slotInterval?, minimumNoticeMinutes?, repeatEveryWeeks?, repeatMaxBookings?, employeeIds: number[] (no vacío), cabinIds?: number[] }`
- `slug` es el tramo del Servicio en el Enlace de reserva (ADR 0018): obligatorio al crear, en minúsculas, mismas reglas que el de Sucursal; único por sucursal entre los servicios no dados de baja (índice parcial, ADR 0004; un tramo de un servicio dado de baja queda libre). `hidden` (por defecto `false`) es el Servicio oculto. El servicio del body de `POST /businesses` también exige `slug` y acepta `hidden`.
- Un Negocio dado de baja con su Dueño (ADR 0024) responde como si no existiera en todo endpoint que lo busca por id o por Enlace de reserva (`GET /businesses`, `GET /businesses/:id`, `by-slug`, sus Sucursales, Empleados, Invitaciones y Turnos): 404 con el mismo mensaje de un Negocio inexistente. Sus Servicios están todos dados de baja, así que los de `/branches/:id/services` salen vacíos y los `by-slug` dan 404.
- Respuesta del Negocio (`presentBusiness`, también la de `POST /businesses`, `GET /businesses/by-slug/:slug` y `PUT /businesses/:id/logo`): suma `logoUrl: string | null`, el Logo del Negocio (ADR 0015); `null` si no tiene. `PATCH /businesses/:id` no lo acepta: se cambia solo con `PUT`/`DELETE /businesses/:id/logo`.
- Servicio oculto (`hidden: true`): no sale en `GET /branches/:id/services`, pero `by-slug` lo devuelve y sus Horarios reservables y `POST /bookings` funcionan igual que los de uno visible. Ocultar no es una medida de seguridad, es sacarlo de la vidriera. El front abre la página de la Sucursal con el Servicio ya elegido pidiéndolo por su tramo, y trata el 404 como página no encontrada.
- Respuesta del servicio (`presentService`): suma `slug`, `hidden` y, en cada elemento de `employees`, `availabilityId`, `imageUrl` (la foto de perfil del Usuario detrás del Empleado, `string | null`, pública junto al nombre) y `slug` (el Enlace de reserva del Usuario, `string | null`: `null` si todavía no lo eligió; es el último tramo del Enlace de reserva de un Empleado elegido, ADR 0026); no se expone ni el email ni el `userId`: `{ id, name, availabilityId, imageUrl, slug }`. Un Servicio es del Negocio o personal (ADR 0021): en el del Negocio `branchId` es el de su Sucursal y `userId` y `availabilityId` son `null`; en el personal `branchId` es `null`, `userId` es el del Usuario, `availabilityId` es la Availability con la que se atiende (`null` una vez dado de baja) y `employees` es `[]`
- Servicio personal: `CreatePersonalServiceDto` es el de `CreateServiceDto` sin `employeeIds` y con `availabilityId` (obligatoria, una Availability del Usuario). `PATCH /services/:id` y `DELETE /services/:id` los hace el propio Usuario (403 si no es el suyo); `PATCH` acepta además `availabilityId` (404 si no es del Usuario, 422 en un Servicio del Negocio). Ofrecer, cambiar la Availability de un Empleado y dejar de ofrecer dan 422 `A personal Service has no Employees`; un `availabilityId` en el `PATCH` de un Servicio del Negocio da 422 `Only a personal Service has its own Availability`. Aceptar, Rechazar, Cancelar, Reagendar y la Ausencia del Invitado de un Turno personal las hace el propio Usuario (403 `Only the assigned Employee can act on this Turno` si es otro). Ocultar y Dar de baja funcionan como en el Servicio del Negocio: oculto no sale en `GET /u/:userSlug`, pero se reserva por su propio tramo, y dar de baja cancela sus Turnos futuros. `GET /services/:id/slots` y `POST /bookings` funcionan igual; el `timeZone` es el de su Availability, y en esa zona se arman los días (agrupar por fecha, alinear, contar el Límite diario). `POST /bookings` responde `employeeName` con el nombre del Usuario
- `UpdateServiceDto`: `{ name?, description?, category?, durationMinutes?, price?, depositPercent?, requiresApproval?, slug?, hidden?, prepMinutes?, dailyLimit?, slotInterval?, minimumNoticeMinutes?, repeatEveryWeeks?, repeatMaxBookings?, availabilityId?, cabinIds?: number[] }`
- `prepMinutes` (Tiempo de preparación): `0`, `5`, `10`, `15`, `30` o `60`; `0` por defecto. Otro valor, o `null` → 400. Cada Turno ocupa la agenda de su Empleado desde `startsAt − prepMinutes` hasta `endsAt`, fijado al reservar: cambiarlo no toca los Turnos ya tomados (ADR 0004).
- `dailyLimit` (Límite diario): entero ≥ 1; sin él, el Servicio no tiene límite (`null` en la respuesta). Cuentan los Turnos `PENDING` y `BOOKED` del Servicio, de todos sus Empleados, cuyo inicio cae en ese día según la zona horaria de la Sucursal. En creación no acepta `null`; en `PATCH`, `dailyLimit: null` lo quita, igual que `depositPercent`. Fuera de rango, con decimales o no numérico → 400.
- `slotInterval` (Intervalo): entero ≥ 1, en minutos; sin él (`null` en la respuesta), los Horarios reservables arrancan cada `durationMinutes`. En creación no acepta `null`; en `PATCH`, `slotInterval: null` lo quita. Otro valor → 400.
- `minimumNoticeMinutes` (Anticipación mínima): entero ≥ 0, en minutos; `0` por defecto. Un Horario reservable arranca como mínimo a `ahora + minimumNoticeMinutes`. Otro valor, o `null` → 400.
- `repeatEveryWeeks` y `repeatMaxBookings` (Repetición): cada cuántas semanas se repite una Serie de Turnos (entero ≥ 1) y cuántos Turnos puede tener como máximo (entero de 2 a 10). Van juntos: los dos con valor o los dos `null` (sin Repetición, `null` en la respuesta). Valen en `CreateServiceDto`, `CreatePersonalServiceDto`, el `service` de `POST /businesses` y `PATCH /services/:id`, donde mandar los dos en `null` saca la Repetición; cambiarla o sacarla no toca Turnos. 400: `Repetición needs both repeatEveryWeeks and repeatMaxBookings` (uno solo, o uno `null` y el otro no), `repeatMaxBookings must be between 2 and 10`, `repeatEveryWeeks must be at least 1`. La respuesta del Servicio (`presentService`, la pública y la del panel) suma los dos campos. El front los lee para ofrecer la Serie. CHECKs en Postgres: `Service_repeat_both_or_neither`, `Service_repeatEveryWeeks_min`, `Service_repeatMaxBookings_range`.
- Los cuatro valen también en el `service` de `POST /businesses`, y la respuesta del servicio (`presentService`) los suma: `prepMinutes`, `dailyLimit`, `slotInterval`, `minimumNoticeMinutes`.
- `depositPercent` (Seña): entero de 0 a 100, porcentaje del precio. Sin él, el Servicio no pide Seña (`null` en la respuesta). Fuera
  de 0-100, con decimales o no numérico → 400. En creación no acepta `null`; en `PATCH`,
  `depositPercent: null` le saca la Seña. También vale en el `service` de `POST /businesses`.
- `requiresApproval` (Aprobación manual): booleano, `false` por defecto. Con `true`, los Turnos del Servicio
  no quedan `BOOKED` al verificarse sino `PENDING`, hasta que el Empleado los Acepta o los Rechaza.
  No booleano → 400. También vale en el `service` de `POST /businesses`.
- `cabinIds` (Cabinas que admite el Servicio, ADR 0030): enteros sin repetidos (no es una lista, tiene decimales o repite un id → 400). En `POST /branches/:id/services` y `PATCH /services/:id`, si viene reemplaza el conjunto entero (`[]` lo deja sin Cabinas) y si no viene no se toca; en la creación, sin él, el Servicio no admite ninguna. 422 `Cabin <cabinId> is not an active Cabin of Branch <branchId>` si alguna no existe, es de otra Sucursal o está dada de baja (nombra la primera que falla; no se guarda nada). En un Servicio personal (`POST /users/me/services` o `PATCH /services/:id` sobre uno), `cabinIds` da 422 `A personal Service has no Cabins`, aunque sea `[]`. Quitar una Cabina de un Servicio no toca los Turnos que ya la ocupan; Dar de baja una Cabina la saca de todos los Servicios que la admitían
- Respuesta del panel (`presentPanelService`): `presentService` más `cabins: [{ id, name }]`, las Cabinas activas que admite, ordenadas por nombre; siempre `[]` en un Servicio personal. La devuelven `GET /employees/me/services`, `GET` y `POST /users/me/services`, `POST /branches/:id/services`, `PATCH /services/:id`, `POST /services/:id/employees` y `PATCH /services/:id/employees/:employeeId`. Las vistas públicas (`GET /branches/:id/services`, `GET /branches/:id/services/by-slug/:slug`, `GET /u/:userSlug`, `GET /u/:userSlug/:serviceSlug`) y el `service` de `POST /businesses` no la traen: el Cliente no ve la Cabina
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
| DELETE | `/employees/:id` | sí | Da de baja (soft-delete) un empleado (solo el dueño); 422 si es el Dueño dándose de baja a sí mismo. Le manda el Aviso de cambio del Turno al Cliente por mail; si el mail falla, igual responde OK. |
| GET | `/businesses/:id/employees` | sí | Lista empleados activos de un negocio (solo el dueño) |
| GET | `/employees/me/services` | sí | Catálogo de Servicios del panel: un grupo por cada Negocio del que el Usuario es Empleado activo; `[]` (200) si no lo es de ninguno |

- Respuesta de `GET /employees/me/services` (`presentCatalogGroup`): `[{ business: { id, name, slug, logoUrl }, role: "owner" | "employee", employeeId, branches: [{ id, name, slug, services: [Servicio] }] }]`. `employeeId` es el Empleado del Usuario en ese Negocio; `role` es `owner` si es su Dueño. Las sucursales van ordenadas por `slug` y aparecen aunque no tengan servicios; no trae servicios dados de baja; un servicio oculto sale solo si el Usuario es Dueño del Negocio o lo atiende. Un Empleado dado de baja de un Negocio deja de recibir ese grupo. Los Servicios van con la misma vista que la pública (`presentService`).

- `CreateEmployeeDto`: `{ email }`
- Respuesta (`presentEmployee`): `{ id, userId, name, email, imageUrl }` — vista del dueño; en el array
  `employees` de un Service la vista pública es `{ id, name, availabilityId, imageUrl, slug }`. `imageUrl: string | null` es la
  foto de perfil del Usuario detrás del Empleado.
- Recontratar a alguien dado de baja crea una fila nueva: no hay `PATCH` para reactivarlo.

## Availability (Horas laborables)

La Availability es del Usuario (ADR 0020, 0021): todo Usuario nace con una, "Horas laborables" (lunes a
viernes de 09:00 a 17:00, `America/Argentina/Buenos_Aires`, predeterminada), creada en la misma
transacción que el Usuario. Todos los endpoints exigen Sesión y valen solo sobre las Availability
propias: la de otro Usuario es 404, como una que no existe.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/availabilities` | sí | Las Availability del Usuario: `[{ id, name, isDefault, timeZone, schedule }]`, con `schedule` como en el detalle y sin Anulaciones |
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

## Out of office (Fuera de la oficina)

Los períodos Fuera de la oficina son del Usuario (ADR 0027), no de una Availability. Todos los endpoints exigen
Sesión y actúan sobre el Usuario de la Sesión: nadie gestiona los períodos de otro, y uno de otro Usuario es 404,
como uno que no existe.

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/users/me/out-of-office` | sí | Los períodos con `endDate` ≥ hoy (hoy, en la zona de la Availability predeterminada del Usuario), por `startDate` ascendente; lista vacía (200) si no hay. Sin paginación: la hace el front |
| POST | `/users/me/out-of-office` | sí | Crea un período; 201 con el período |
| PUT | `/users/me/out-of-office/:id` | sí | Reemplaza los datos del período; 200 con el período |
| DELETE | `/users/me/out-of-office/:id` | sí | Lo borra; 204 |

- Período (respuesta): `{ id, startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD", reason, notes: string | null, showNotePublicly }`. Las fechas son días enteros, inclusivas, sin hora ni zona.
- Body de `POST` y `PUT`: `{ startDate, endDate, reason, notes?, showNotePublicly? }`. `reason` es un `OutOfOfficeReason`: `UNSPECIFIED | VACATION | TRAVEL | SICK_LEAVE | PUBLIC_HOLIDAY`. `notes` por defecto `null`; `showNotePublicly` por defecto `false`.
- Se aceptan períodos solapados y con fechas pasadas.
- Errores (el front muestra el `message` del 422 y del 409 en el modal, tal cual):
  - fecha que no es `YYYY-MM-DD` o no existe, `reason` desconocido, `notes` que no es texto, campo extra → 400
  - `endDate` anterior a `startDate` → 422 `La fecha de fin no puede ser anterior a la de inicio`
  - otro período del Usuario con el mismo `startDate` y `endDate` → 409 `Ya hay un período Fuera de la oficina con esas fechas` (en `PUT`, el propio período no cuenta)
  - en `PUT` o `DELETE`, un período que no existe o es de otro Usuario → 404 `Out of office <id> not found`

## Holidays (Día festivo)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/holidays/countries` | sí | Los calendarios y países entre los que el Usuario elige sus Días festivos (ADR 0027): `200 [{ code, name }]`. Primero los cinco calendarios religiosos con nombre fijo (`Feriados cristianos`, `Feriados hindúes`, `Feriados judíos`, `Feriados musulmanes`, `Feriados ortodoxos`), después los países ordenados por nombre en castellano |
| GET | `/users/me/holidays` | sí | `200 { countryCode: string \| null, holidays: [{ id, name, date: "YYYY-MM-DD", enabled }] }`: los Días festivos de hoy en adelante del año en curso y del siguiente, por fecha. Sin país, `holidays: []`. `id` es el `eventId` de Google |
| PUT | `/users/me/holidays` | sí | Body `{ countryCode: string \| null }`. Guarda el país y vacía los Días festivos apagados (cambiar de país arranca con todo prendido); `null` saca el país. Responde como el `GET` |
| PATCH | `/users/me/holidays/:holidayId` | sí | Body `{ enabled: boolean }`. Apaga o vuelve a prender el Día festivo. Responde como el `GET` |
| GET | `/users/me/holidays/conflicts` | sí | `200 [{ holidayId, holidayName, date, bookings: [{ id, startsAt, clientName }] }]`: los Turnos pendientes o aceptados, futuros, que atiende el Usuario y que caen en Días festivos prendidos, por fecha del Día festivo. El día de cada Turno se lee en la zona de la Availability con la que se atiende. Sin país, `[]` |

- Sin `GOOGLE_CALENDAR_API_KEY` → 503 `Días festivos no configurados`. Todos los endpoints de Días festivos que vengan después responden igual
- `PUT /users/me/holidays`: `countryCode` ausente o que no es texto → 400; un código que no está en `GET /holidays/countries` → 400 `Unknown holiday country <código>`
- `PATCH /users/me/holidays/:holidayId`: `enabled` ausente o que no es booleano → 400; sin país, o un id que no es del calendario actual del año en curso ni del siguiente → 404 `Holiday <id> not found`
- Los Días festivos llegan de Google Calendar con IDs `es.*` y se cachean en Postgres (`HolidayCache`); se piden de nuevo cuando la caché tiene más de 7 días

## Slots (Horario reservable)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/services/:id/slots` | no | Los Horarios reservables de un Servicio, día por día, en un rango de fechas: la unión de los de cada Empleado que lo Ofrece (ADR 0021). `employeeId` opcional (Empleado elegido, ADR 0026): solo los de ese Empleado |
| GET | `/services/:id/series-slots` | no | Las fechas de una Serie de un Servicio con Repetición (#302) y quién la atiende. Ver abajo |

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
- No se copian de cal.diy `showOptimizedSlots`, `offsetStart`, asientos ni `travelSchedules`
- Fuera de la oficina (ADR 0027): una fecha D, leída en la zona de la Availability, en algún período `startDate ≤ D ≤ endDate` del Usuario que atiende no tiene Franjas, y eso le gana a una Anulación con horas de esa fecha. En un Servicio del Negocio los otros Empleados siguen ofreciendo horarios; si no está ninguno, el día es `NOT_WORKING`. No valida nada nuevo en `POST /bookings` ni al Reagendar: un día bloqueado no tiene horarios, y tomarlo da el 422 de siempre
- `employeeId` (query, opcional, entero): con él la respuesta tiene la misma forma pero solo con los Horarios reservables de ese Empleado. 404 `Employee <employeeId> does not offer Service <serviceId>` si no es un Empleado activo que Ofrece el Servicio (nunca lo ofreció, dejó de ofrecerlo o fue dado de baja del Negocio); 400 si el Servicio es personal; 400 si no es un entero.
- Cabinas (ADR 0030): en un Servicio que admite Cabinas, el horario de un Empleado vale solo si alguna de ellas no tiene un Turno `PENDING` o `BOOKED`, de cualquier Servicio, que se solape con `[inicio − Tiempo de preparación, inicio + duración)`. Un día que se queda sin horarios por eso es `FULLY_BOOKED`. Con `employeeId` se exigen las dos cosas: ese Empleado y una Cabina libre. Un Servicio sin Cabinas no cambia, y los Turnos tomados antes de que las admitiera (sin Cabina) no ocupan ninguna. La respuesta no dice qué Cabina queda libre
- Respuesta: `{ timeZone, days: [{ date, slots: [ISO instants], reason? }] }`, con `timeZone` la de la Sucursal (en la que están las fechas `date`). `reason` solo aparece cuando `slots` está vacío: `NOT_WORKING` (ninguna Franja del día alcanza para la duración del Servicio, o Anulación de día libre) o `FULLY_BOOKED` (había horarios pero los Turnos, la Anticipación mínima o el Límite diario se los llevaron todos). Solo en un Servicio personal hay además `OUT_OF_OFFICE` (el día habría tenido Franjas pero el Usuario está Fuera de la oficina), y entonces el día trae `outOfOffice: { reason: OutOfOfficeReason, notes: string | null }`: `notes` es la nota del período si tiene `showNotePublicly`, si no `null`; si varios períodos se solapan gana el de `startDate` más temprano. Un día que de todos modos no se trabaja sigue siendo `NOT_WORKING`. Un Día festivo prendido del país del Usuario (`UserHolidaySettings`) bloquea igual que un período de ese día: `OUT_OF_OFFICE` con `outOfOffice: { reason: "PUBLIC_HOLIDAY", notes: <nombre del Día festivo> }`, y si el mismo día cae en un período, gana el período. Sin país, o sin `GOOGLE_CALENDAR_API_KEY`, los Días festivos se ignoran y el cálculo sigue andando (nunca 503)

`GET /services/:id/series-slots?startsAt=<ISO>&count=<n>&employeeId?` (sin Sesión, #302): las fechas de una Serie, a la misma hora local (en la zona de la Sucursal, o de la Availability en un Servicio personal) cada `repeatEveryWeeks` semanas; un cambio de horario de verano no corre la hora. Cada fecha se valida con los mismos Horarios reservables que un Turno suelto, fijando al Empleado de la Serie: con `employeeId` (Empleado elegido), ese; sin él, el que Ofrece el Servicio, está libre en el primer horario y lo está en más fechas, y si empatan el que hace más tiempo que no recibe un Turno del Servicio (después, el de menor id). En un Servicio personal, `employeeId` es `null`.
- Respuesta: `{ employeeId: number | null, dates: [{ date: 'YYYY-MM-DD', startsAt: ISO, available: boolean }] }`. `available: false` es un choque (Turno tomado, Fuera de la oficina, Día festivo, Límite diario, sin Cabina libre, etc.), no un error.
- Errores: 404 `Service not found or retired`; 422 `Service <id> has no Repetición`; 400 `count must be between 2 and <repeatMaxBookings>`; 400 `startsAt must be an ISO date-string`; 422 `Slot <ISO> is not available for Service <id>` si el primer horario no es reservable; los de `employeeId` son los de `GET /services/:id/slots`.

## Bookings (Turno)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/bookings/code` | no | Pide un Código de verificación para un email, mandado por mail; 204 |
| POST | `/bookings` | no | Crea un turno con el Código de verificación de `clientEmail` ya validado; queda `BOOKED`, o `PENDING` si el Servicio tiene `requiresApproval` (ADR 0022). Con `repeat`, una Serie de Turnos (#303) |
| PATCH | `/bookings/:id/accept` | sí | Acepta un Turno pendiente: `PENDING` → `BOOKED` y guarda `acceptedAt` (solo el Empleado asignado) |
| PATCH | `/bookings/:id/reject` | sí | Rechaza un Turno pendiente: `PENDING` → `REJECTED`, libera el horario (solo el Empleado asignado). Body opcional `{ reason?: string }` (Motivo de cancelación; ver abajo). Le manda el Aviso de cambio del Turno al Cliente por mail; si el mail falla, igual responde OK. |
| PATCH | `/bookings/:id/cancel` | sí | Cancela un Turno aceptado: `BOOKED` → `CANCELLED`, libera el horario (solo el Empleado asignado). Body opcional `{ reason?: string }` (Motivo de cancelación; ver abajo). Le manda el Aviso de cambio del Turno al Cliente por mail; si el mail falla, igual responde OK. |
| PATCH | `/bookings/:id/reschedule` | sí | Reagenda un Turno aceptado a otro Horario reservable del mismo Servicio y Empleado (un Turno con Empleado elegido solo a horarios de ese Empleado), reemplazándolo (ADR 0031): **responde el Turno nuevo, con otro `id`**; sigue `BOOKED` y no repite la Verificación de email (solo el Empleado asignado). Le manda el Aviso de cambio del Turno al Cliente por mail; si el mail falla, igual responde OK. |
| PATCH | `/bookings/:id/no-show` | sí | Marca la Ausencia del Invitado de un Turno aceptado cuyo horario ya pasó: guarda `noShowAt` con la hora actual, sin cambiar `status` (solo el Empleado asignado) |
| DELETE | `/bookings/:id/no-show` | sí | Desmarca la Ausencia del Invitado: borra `noShowAt` en cualquier momento y responde el Turno (solo el Empleado asignado) |
| GET | `/bookings/:id/history` | sí | Historial del Turno: `{ entries: BookingHistoryEntry[] }` en orden cronológico (solo el Empleado asignado) |
| GET | `/businesses/:id/bookings` | sí | Lista todos los turnos de un negocio, salvo los originales reagendados (ADR 0031) (solo el dueño) |
| GET | `/booking-links/:secret` | no | Enlace del Turno: abre ese Turno solo, en cualquier estado (ADR 0022); tras Reagendar, el Turno nuevo (ADR 0031) |
| PATCH | `/booking-links/:secret/cancel` | no | Cancela ese Turno, si está pendiente o aceptado y no empezó. Body opcional `{ reason?: string }` (Motivo de cancelación; ver abajo). Le manda el Aviso de cambio del Turno al Cliente por mail; si el mail falla, igual responde OK. |
| PATCH | `/booking-links/:secret/deposit` | no | Paga la Seña de ese Turno (simulado), si está pendiente o aceptado, tiene Seña pendiente y no empezó. No manda mail (ADR 0027) |
| PATCH | `/booking-links/:secret/employee-no-show` | no | Marca la Ausencia del Anfitrión de ese Turno, si está aceptado, sin Ausencia del Invitado, y entre que empieza y 24 horas después de que termina. Nadie la deshace |
| POST | `/booking-links/:secret/rating` | no | Califica ese Turno (Calificación): puntaje de 1 a 5 y comentario opcional, una sola vez y sin editarla. Responde 201 con el Turno. No manda mail |
| PATCH | `/booking-links/:secret/reschedule` | no | Reagenda ese Turno a otro Horario reservable del mismo Servicio, reemplazándolo (ADR 0031): responde el Turno nuevo, con otro `id`, que lleva el mismo secreto. Le manda el Aviso de cambio del Turno al Cliente por mail; si el mail falla, igual responde OK. |

- **Código de verificación** (ADR 0022, reemplaza al flujo por link del ADR 0005/0006 para el Turno): Reservar exige un Código de verificación vigente para `clientEmail`. `RequestBookingCodeDto`: `{ email }` (se recorta y pasa a minúsculas). `POST /bookings/code` manda un TOTP sin estado atado al email, ventana de 15 minutos, 6 caracteres del alfabeto del ADR 0006 (A-Z y 2-9, sin `0/O` ni `1/I`); no se guarda nada por código pedido. 400 si `email` es inválido. 429 `Too many verification codes requested for <email>` al sexto pedido para ese email en 15 minutos.
- `CreateBookingDto`: `{ serviceId, startsAt: ISO date-string, employeeId?, clientName, clientEmail, notes?, code }`; sin `employeeId` el back asigna el Empleado (ver abajo). Falta `code` → 400; no valida para `clientEmail` en su ventana → 400 `Invalid or expired verification code for <email>`, y no crea nada.
- `notes` (Comentario del Turno): texto libre, se recorta; hasta 500 caracteres. Vacío o solo espacios se guarda como sin Comentario (`null`). Más largo, no string o `null` → 400. No se valida el contenido
- `CreateBookingDto` suma `employeeId?: number` (Empleado elegido, ADR 0026): con él el Turno queda con ese Empleado y `Booking.employeeChosen = true` (`false` por defecto), sin round robin. Si ese Empleado no está libre en `startsAt`: 422 `Slot <ISO> is not available for Service <id>`, aunque otro esté libre; no se reasigna. 404 `Employee <employeeId> does not offer Service <serviceId>` si no es un Empleado activo que Ofrece el Servicio; 400 si el Servicio es personal. Un Turno con Empleado elegido cuenta para el round robin como cualquier otro.
- Respuesta (`presentBooking`): `{ id, serviceId, employeeId, startsAt, endsAt, status, notes, seriesId }` (`employeeId` es `null` en un Turno de un Servicio personal, que atiende el propio Usuario; la ocupación es por Usuario, así que un Turno personal bloquea ese tramo en sus Servicios del Negocio y al revés, ADR 0021); `notes` es `null` si el Cliente no dejó Comentario del Turno. `POST /bookings` agrega `employeeName`, el nombre del Empleado asignado, y `link`, el secreto del Enlace del Turno (ver más abajo)
- **Asignación** (ROUND_ROBIN de cal.diy, ADR 0021): entre los Empleados libres en ese horario, `POST /bookings` asigna el que hace más tiempo que no recibe un Turno `PENDING` o `BOOKED` de ese Servicio (por `createdAt`); sin Turnos previos, gana ese; si empatan, el de menor id. Con Aprobación manual el Turno queda `PENDING` para el asignado
- Respuesta solo-dueño (`presentBookingForOwner`, usada en el listado): agrega `clientName, clientEmail` y `cabin` (ver abajo)
- Historial del Turno (`GET /bookings/:id/history`, ADR 0033): se deduce de los campos del Turno, sin tabla nueva. Con Sesión; mismos permisos que las acciones del Turno (403 si el Usuario no es quien lo atiende, 404 `Booking not found` si no existe). Cada entrada es `{ type, at, actor, reason, from }`: `type` es `'booked' | 'accepted' | 'rejected' | 'cancelled' | 'rescheduled' | 'noShow' | 'employeeNoShow' | 'depositPaid' | 'rated'`; `at` ISO; `actor` `'employee' | 'client' | 'retirement' | null`; `reason` el Motivo de cancelación o `null`; `from` `{ startsAt, endsAt }` solo en `rescheduled` (el horario de antes), `null` en el resto. Fuentes: `createdAt` (`booked`, `client`), `acceptedAt` (`accepted`, `employee`; se omite si es igual a `createdAt`), `rejectedAt` y `cancelledAt` con `cancelledBy` y `cancellationReason`, `noShowAt` (`employee`), `employeeNoShowAt` (`client`), `depositPaidAt` (`client`) y la Calificación (`client`). Recorre `fromRescheduleId` hacia atrás (ADR 0031): cada original aporta sus entradas y un `rescheduled` en su `cancelledAt`, con su `from` y el actor de su `cancelledBy`.
- Motivo de cancelación y quién (ADR 0033): `PATCH /bookings/:id/cancel`, `PATCH /bookings/:id/reject` y `PATCH /booking-links/:secret/cancel` aceptan un body opcional `{ reason?: string }`, recortado; vacío o en blanco es sin motivo. Más de 500 caracteres: 400 `reason is too long`. El Turno guarda `cancelledBy` (`'EMPLOYEE'` al Cancelar o Rechazar desde el panel, `'CLIENT'` por el Enlace del Turno, `'RETIREMENT'` en una baja de Servicio, Empleado o Usuario; en el original de un Reagendamiento, quién Reagendó, sin motivo) y `cancellationReason`. `acceptedAt` (ISO) se guarda al Aceptar y al crear un Turno que nace `BOOKED`; es `null` mientras está pendiente. Las respuestas del panel (`GET /users/me/bookings` y las de `/bookings/:id/...`, vía `presentBooking`) suman `acceptedAt`, `cancelledBy` (`'EMPLOYEE' | 'CLIENT' | 'RETIREMENT' | null`) y `cancellationReason` (`string | null`); `ClientBooking` suma solo `cancellationReason`. Los Turnos cancelados antes de que existieran los campos tienen `cancelledBy` en `null`. Si hay motivo, el Aviso de cambio del Turno de cancelación y de rechazo lo lleva; si el mail falla, el cambio queda igual.
- Cabina en el panel (ADR 0030): `cabin: { id, name } | null` sale en `GET /users/me/bookings`, en `GET /businesses/:id/bookings` y en la respuesta de `PATCH /bookings/:id/reschedule` (`presentPanelBooking`: `presentBooking` más `cabin`); es `null` en un Turno sin Cabina. Una Cabina dada de baja se sigue mostrando con su nombre en los Turnos que la ocupan. Ni `GET /booking-links/:secret` ni ninguna respuesta del Enlace del Turno (`ClientBooking`) la exponen, ni tampoco `POST /bookings` ni el resto de los PATCH de `/bookings/:id/...`
- **Reservar una Serie** (#303): `POST /bookings` suma `repeat?: { count: number, skipDates?: string[] }` (`skipDates` en `YYYY-MM-DD`, fechas de la Serie que no se reservan). Sin `repeat` nada cambia. Con `repeat` hace falta un solo Código de verificación para toda la Serie, que no se gasta: sirve para reintentar. Las fechas son las de `GET /services/:id/series-slots` con el mismo `startsAt`, `count` y `employeeId`; todos los Turnos van con el mismo Empleado y `employeeChosen`, y se crean en una transacción, todos o ninguno, cada uno con su `link`, `price` y `depositAmount`, todos `BOOKED` o todos `PENDING` con Aprobación manual. Cada Turno toma la Cabina del anterior de la Serie si está libre y si no la que dice la ADR 0030; si una Cabina choca prueba otra libre. Sale una sola Confirmación de reserva (#304) con todas las fechas, en la zona del Turno, y el Enlace del Turno de cada una; si el mail falla se loguea y la Serie igual queda creada. Responde lo de siempre del primer Turno (`seriesId` incluido) más `series: { id, bookings: [{ startsAt, link }] }`, un elemento por Turno creado, por fecha. Errores: los de `count` de `series-slots` (400 `count must be between 2 and <repeatMaxBookings>`, 422 `Service <id> has no Repetición`, 422 `Slot <ISO> is not available for Service <id>` si `startsAt` no es reservable, aunque esté en `skipDates`); 400 `skipDates are not dates of the Serie: <fechas>`; 422 `A Serie needs at least 2 Turnos` si quedan menos de 2; 409 `Series dates not available: <YYYY-MM-DD>,<YYYY-MM-DD>` con las fechas que chocan (Turno tomado, Fuera de la oficina, Día festivo, Límite diario, sin Cabina libre), sin crear ningún Turno: el front lee las fechas después de los dos puntos y vuelve al paso Fechas con esas marcadas, y reintenta con el mismo código poniéndolas en `skipDates`. `seriesId` (uuid, `null` en un Turno suelto) sale en `presentBooking` (las respuestas de `/bookings/:id/...`) y en `GET /users/me/bookings`; Reagendar lo copia al Turno nuevo.
- **Ciclo de vida** (ADR 0022): no existe el Turno sin verificar. `POST /bookings`, con el código ya validado, crea
  directamente `BOOKED`, o `PENDING` si el Servicio tiene Aprobación manual; de `PENDING`, Aceptar → `BOOKED` y
  Rechazar → `REJECTED`.
- **Aceptar / Rechazar**: exigen Sesión y que el usuario sea el Empleado asignado al Turno (403 `Only the assigned Employee can accept or reject this Turno` si no; 404 si el Turno no existe). Un Turno que no
  está `PENDING` da 422 `Turno is not pending`. Responden el Turno (`presentBooking`).
- **Cancelar / Reagendar / Ausencia del Invitado** (`/bookings/:id/...`, del Empleado): exigen Sesión y ser el Empleado asignado al Turno (403 `Only the assigned Employee can act on this Turno`; 404 si el Turno no existe). Un Turno que no está `BOOKED` da 422 `Turno is not booked`. Responden el Turno (`presentBooking`); Ausencia del Invitado le suma `noShowAt`. No cambian con el ADR 0022: solo valen sobre un Turno ya aceptado.
  - **Reagendar reemplaza el Turno** (ADR 0031), por las dos vías y en una sola transacción: el original queda `CANCELLED` con `cancelledAt`, `rescheduled = true` y sin Enlace; el Turno nuevo, con otro `id` y `fromRescheduleId` igual al del original, lleva el secreto del Enlace del Turno y copia Cliente (una fila `Client` nueva), `notes`, `employeeChosen`, `price`, `depositAmount` y `depositPaidAt`. Si falla la creación, el original no cambia. Las respuestas de Reagendar traen el Turno nuevo.
  - `RescheduleBookingDto`: `{ startsAt: ISO date-string }`; la duración se conserva, y la preparación es la que el Servicio tiene hoy. Un día que ya alcanzó el Límite diario no ofrece Horarios reservables, así que mover un Turno ahí es el mismo 422 (sin contar al propio Turno). `startsAt` inválido → 400. Si no es un Horario reservable de ningún Empleado según el mismo cálculo que `GET /services/:id/slots` → 422 `Slot <ISO> is not available for Service <id>`. El horario que el Turno ya ocupaba cuenta como libre. Si el Empleado asignado está libre en el horario nuevo se queda con el Turno; si no, pasa a otro libre (el de la regla de Asignación) y `employeeId` de la respuesta cambia. **Salvo en un Turno con `employeeChosen`** (ADR 0026): solo se mueve a horarios de su Empleado, y si no está libre, o ya no Ofrece el Servicio, es el mismo 422 `Slot <ISO> is not available for Service <id>`; el Turno sigue en pie y queda Cancelar. Vale igual por `PATCH /booking-links/:secret/reschedule`. **Cabinas** (ADR 0030), por las dos vías, con el conjunto que el Servicio admite hoy: si la Cabina del Turno sigue en el conjunto y está libre en el horario nuevo, la conserva; si no (ocupada o ya no admitida) pasa a otra libre con la regla de `POST /bookings` (la que hace más tiempo que no recibe un Turno `PENDING` o `BOOKED` de cualquier Servicio, desempate por menor id); un Turno con `cabinId` null de un Servicio que ahora las admite recibe una de la misma forma; si el Servicio ya no admite ninguna, queda con `cabinId` null. El horario que el propio Turno ocupaba cuenta como libre también para su Cabina, así que mover un Turno a un horario que se solapa con el suyo no se bloquea por ella. El Empleado y la Cabina se resuelven por separado: un Turno con `employeeChosen` conserva su regla y además necesita una Cabina libre. Si no queda ninguna es el mismo 422 `Slot <ISO> is not available for Service <id>`.
  - Ausencia del Invitado: 422 si el Turno no terminó todavía (`Turno has not ended yet`), ya tiene Ausencia del Invitado (`Turno already has an Ausencia`) o tiene Ausencia del Anfitrión (`Turno has an Employee no-show`).
  - Desmarcar la Ausencia del Invitado (`DELETE /bookings/:id/no-show`): sin body, mismos permisos (403 y 404 de arriba, 422 `Turno is not booked`). 422 `Turno has no Ausencia` si no la tiene. Vale en cualquier momento. Responde el Turno como marcarla, con `noShowAt` en `null`. La escritura va con guarda (`noShowAt` no nulo en el `WHERE`), así una carrera no pisa otra marca; si la guarda falla entre la lectura y la escritura, el 422 trae `Turno is not booked or has no Ausencia`. Un Turno aceptado ya terminado sin Ausencia ni Falta del Empleado vuelve a contar como Turno atendido.
- **Enlace del Turno** (ADR 0022): cada Turno tiene un identificador secreto, único y no adivinable (`link`, 256 bits, apto para URL), generado al crear; no sale en ninguna otra respuesta salvo en la de `POST /bookings`. `POST /bookings` manda la Confirmación de reserva al Cliente con el link `<URL del front>/turnos/<link>`; si el Turno tiene Seña, el mail suma una línea con el monto y avisa que se paga desde ese mismo Enlace del Turno.
  - **Seña del Turno**: `POST /bookings` guarda `depositAmount` = `price × depositPercent / 100` redondeado al centavo, o `null` si el Servicio no pide Seña o `depositPercent` es 0; `depositPaidAt` nace en `null`. Body y respuesta de `POST /bookings` no cambian. El monto queda fijo: cambiar después el precio o la Seña del Servicio no toca los Turnos ya reservados, y Reagendar, Cancelar, Rechazar y Aceptar no tocan estos campos. Seña pendiente = `depositAmount !== null && depositPaidAt === null`.
  - `GET /booking-links/:secret`: sin Sesión ni acceso. Responde el Turno en cualquier estado (`presentClientBooking`): `{ id, status, startsAt, endsAt, timeZone, notes, clientName, serviceId, employeeId, employeeChosen, depositAmount, depositPaidAt, employeeNoShowAt, canMarkEmployeeNoShow, rating, canRate, service: { name, durationMinutes, price, depositPercent }, employeeName, business: { name, slug } | null, branch: { name, slug, address, coverUrl } | null, user: { slug } | null, series: { bookings: [{ startsAt, status, link }] } | null }`. `series` (#304) son los Turnos vigentes de la Serie del Turno, él incluido, por `startsAt` (desempate por id), cada uno con su `status` y su Enlace del Turno, sin los originales que Reagendar reemplazó; `null` si el Turno no es de una Serie. `business` y `branch` son `null` en un Servicio personal; `user` es `null` en un Servicio del Negocio y `{ slug }`, el Enlace de reserva del Usuario que atiende, en uno personal; `timeZone` es la de la Sucursal, o la de la Availability en un Servicio personal; `coverUrl` es la primera Imagen de Sucursal por `order`, o `null` si no tiene ninguna; `employeeNoShowAt` es `null` mientras el Turno no tiene Ausencia del Anfitrión; `canMarkEmployeeNoShow` es `true` si hoy se puede marcar (lo calcula el back, porque el Cliente no ve la Ausencia del Invitado, que nunca se expone en el Enlace del Turno); `rating` es `{ score, comment, createdAt } | null` (`null` mientras el Turno no tiene Calificación; `comment` es `null` si no dejó) y `canRate` es `true` si hoy se puede Calificar (lo calcula el back con la regla de abajo). 404 `Turno not found` si el Enlace no corresponde a ningún Turno.
  - `PATCH /booking-links/:secret/cancel`: cancela un Turno `PENDING` o `BOOKED`, hasta que empieza; responde el Turno con la misma forma que `GET /booking-links/:secret`. 404 `Turno not found` para un Enlace desconocido; 422 `Turno is not pending or booked` si no está pendiente ni aceptado; 422 `Turno <id> already started` si su horario ya empezó.
  - `PATCH /booking-links/:secret/deposit` (Pagar la Seña, ADR 0027): sin Sesión y sin body; simulado, Agendic no cobra. Deja `depositPaidAt` en la hora actual y responde el Turno con la misma forma que `GET /booking-links/:secret`. Vale sobre un Turno `PENDING` o `BOOKED`, sin necesidad de que lo Acepten. 404 `Turno not found` para un Enlace desconocido; 422 `Turno is not pending or booked`; 422 `Turno <id> already started`; 422 `Turno <id> has no Seña`; 422 `Turno <id> already has its Seña paid`. La escritura va con guarda (solo si el Turno sigue pendiente o aceptado, sin empezar, con Seña y sin pagar), así una carrera no lo pisa; si la guarda falla entre la lectura y la escritura, el 422 trae `Turno is not pending or booked, has already started, has no Seña, or already has its Seña paid`. No manda mail. Después de pagarla, Reagendar (por el Enlace y desde Mis turnos) la deja pagada, también si el Turno vuelve a quedar `PENDING`; Cancelar y Rechazar no la tocan.
  - `PATCH /booking-links/:secret/employee-no-show` (Ausencia del Anfitrión): sin Sesión y sin body. Deja `employeeNoShowAt` en la hora actual y responde 200 con el Turno con la misma forma que `GET /booking-links/:secret`. Vale en un Turno `BOOKED` sin Ausencia del Invitado, desde `startsAt` hasta `endsAt` + 24 horas, inclusive en los dos bordes; igual en un Servicio personal. Nadie la deshace. 404 `Turno not found` para un Enlace desconocido; 422, en este orden: `Turno is not booked`, `Turno has not started yet`, `Employee no-show window closed`, `Turno has an Ausencia`, `Employee no-show already marked`. La escritura va con guarda, así una carrera no la pisa; si la guarda falla entre la lectura y la escritura, el 422 trae `Employee no-show not allowed for this Turno`. No manda mail.
  - `POST /booking-links/:secret/rating` (Calificación): sin Sesión, con body `{ score, comment? }`; `score` es un entero de 1 a 5 y `comment` hasta 500 caracteres (si no, 400 con el mensaje de validación). Un `comment` vacío o de solo espacios se guarda `null`; si no, se guarda recortado. Un Turno se puede Calificar si está `BOOKED`, `endsAt` < ahora (estricto), no tiene Ausencia del Invitado, no tiene Ausencia del Anfitrión y no tiene Calificación; igual en un Servicio personal. Responde **201** con el Turno con la misma forma que `GET /booking-links/:secret`. 404 `Turno not found` para un Enlace desconocido; 409 `Turno already rated` si ya tiene Calificación (se chequea antes que la regla, y también si dos pedidos corren juntos: lo garantiza el índice único de `BookingRating.bookingId`, ADR 0004); 422 `Turno cannot be rated` si no cumple el resto de la regla. No se edita ni se borra. No manda mail. El front muestra el formulario de estrellas solo con `canRate` en `true`, y la Calificación ya dejada cuando `rating` no es `null`.
  - `PATCH /booking-links/:secret/reschedule`: `RescheduleBookingDto`, mismas reglas que el Reagendar del Empleado (409 `Overlaps a booked Turno for this Employee`, 422 `Slot <ISO> is not available for Service <id>`, 400 `startsAt` inválido), con una diferencia: si el Servicio tiene Aprobación manual, el Turno queda (o vuelve a quedar) `PENDING`, sea cual sea su estado antes de Reagendar; también vale sobre un Turno `PENDING`. 404 `Turno not found` para un Enlace desconocido; 422 `Turno is not pending or booked` si no está pendiente ni aceptado.
- **Horario ocupado (409 `Overlaps a booked Turno for this Employee`)**. Como el Turno nace ya `BOOKED` o
  `PENDING`, la creación misma es la que puede chocar:
  - `POST /bookings` en un Servicio que admite Cabinas (ADR 0030): después de elegir el Empleado con la regla de siempre, asigna una Cabina de las del Servicio libres en `[prepStartsAt, endsAt)`: la que hace más tiempo que no recibe un Turno `PENDING` o `BOOKED` de cualquier Servicio (sin Turnos previos gana esa; si empatan, la de menor id), y la guarda en `Booking.cabinId`. Un Servicio sin Cabinas guarda `null`. Si no queda ninguna es el mismo 422 `Slot <ISO> is not available for Service <id>`. Dos `POST /bookings` casi juntos por la última Cabina: uno da 201, el otro 409 `Overlaps a booked Turno for this Employee` (el mismo de abajo), por la exclusion constraint `Booking_cabin_no_overlap` (ADR 0004). Ninguna respuesta de Turno expone la Cabina
  - `POST /bookings` → 422 `Slot <ISO> is not available for Service <id>` si `startsAt` no está entre los Horarios reservables que `GET /services/:id/slots` calcula en ese momento para algún Empleado (nadie libre, fuera de las Franjas, fuera de la grilla del Intervalo, antes de la Anticipación mínima). El front lo muestra como «ese horario ya no está disponible» y vuelve a pedir la lista.
  - Dos `POST /bookings` casi juntos para el mismo horario: uno da 201, el otro 409 `Overlaps a booked Turno for this Employee`. Lo garantiza la exclusion constraint `Booking_no_overlap` de Postgres (ADR 0004), no solo el chequeo del caso de uso.
  - `POST /bookings` → 409 `The Service reached its Límite diario that day` si el Servicio ya tiene `dailyLimit` Turnos `PENDING` o `BOOKED` ese día de la Sucursal. Dos creaciones casi juntas del mismo Servicio no pueden pasarlo: la creación cuenta y crea dentro de una transacción con `pg_advisory_xact_lock` por Servicio (ADR 0004).

## Analíticas (#264, #270, #271, #272, #273, #274)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/analytics/personal?from=YYYY-MM-DD&to=YYYY-MM-DD&serviceId=<id>?` | sí | KPIs de los Servicios personales del Usuario de la Sesión (incluidos los ocultos y los dados de baja; nunca los del Negocio ni los de otro Usuario), cada uno con su valor en el período anterior |

- Respuesta 200: `{ granularity, trend, popularServices, recentRatings, filterOptions, kpis: Record<'booked' \| 'attended' \| 'rescheduled' \| 'cancelled' \| 'rejected' \| 'pending' \| 'noShows' \| 'employeeNoShows' \| 'averageRating' \| 'csat' \| 'revenue', { current: number \| null, previous: number \| null }> }`. `averageRating` y `csat` son `null` sin Calificaciones en el período; `csat` va de 0 a 100 con un decimal; `revenue` es la suma de `price` de los Turnos atendidos, `0` si no hay. El front calcula la variación % contra `previous` y muestra `null` como "—".
- **Tendencia y listados** (#271), con el mismo rango, el mismo `serviceId` y las mismas reglas de conteo que los KPIs; `filterOptions` no se filtra:
  - `granularity`: `'day'` hasta 31 días, `'week'` hasta 183, `'month'` en rangos más largos.
  - `trend`: `{ bucket: 'YYYY-MM-DD', booked, attended, rescheduled, cancelled, rejected, noShows, employeeNoShows }[]`. `bucket` es la fecha local en que arranca el período: con `week`, el `weekStart` del Usuario; con `month`, el día 1. Aparecen todos los períodos del rango, en orden y con 0 si no tienen Turnos (el primero y el último pueden arrancar fuera del rango, pero solo cuentan Turnos dentro de él). Cada serie cuenta con la regla y el instante de su KPI.
  - `popularServices`: `{ serviceId, name, count }[]`, top 5 por cantidad de Turnos con `startsAt` en el rango, sin los Rechazados ni los originales reagendados; orden por cantidad descendente y desempate por nombre.
  - `recentRatings`: `{ score, comment, createdAt, clientName, serviceName, employeeName: null }[]`, las 10 Calificaciones más recientes con `createdAt` en el rango (`employeeName` es siempre `null` en los Servicios personales).
  - `filterOptions.services`: `{ id, name }[]` con todos los Servicios personales del Usuario, ocultos y dados de baja incluidos, por nombre.
  - El front usa `trend` sin rellenar huecos y `filterOptions` para el filtro por Servicio.
- **Período anterior**: mismo largo en días que `from`..`to` (los dos días cuentan) y termina el día antes de `from`.
- **Reglas de conteo** (todas excluyen los originales reagendados, `rescheduled = true`, salvo `rescheduled`). Un Turno entra en el rango por la fecha local del instante, en la zona de la Availability predeterminada del Usuario (en los Servicios del Negocio, la de la Sucursal de cada Turno; ver Analíticas del Negocio):
  - `booked`: todos menos los que tienen `fromRescheduleId`, por `createdAt`
  - `attended`: `BOOKED`, `endsAt` < ahora, sin `noShowAt` ni `employeeNoShowAt`, por `startsAt`
  - `rescheduled`: `rescheduled = true`, por `cancelledAt`
  - `cancelled`: `CANCELLED` y `rescheduled IS NOT TRUE`, por `cancelledAt`
  - `rejected`: `REJECTED`, por `rejectedAt`
  - `pending`: `PENDING` al momento de la consulta, por `startsAt`
  - `noShows` / `employeeNoShows`: con `noShowAt` / `employeeNoShowAt`, por `startsAt`
  - `averageRating` / `csat`: promedio de `score` / % de Calificaciones con `score` ≥ 4, por `BookingRating.createdAt`
  - `revenue`: suma de `price` de los Turnos `attended`, por `startsAt`
- Errores:
  - 401 sin Sesión
  - 400 `Invalid analytics range <from>..<to>`: una fecha mal formada o inexistente, falta una, `from` > `to`, o más de 366 días entre las dos
  - 404 `Service <id> not found`: `serviceId` no es un Servicio personal del Usuario (no existe, es de otro Usuario o es del Negocio)
  - 422 si el Usuario no tiene Availability predeterminada
- El conteo vive en el puerto `AnalyticsRepository` (SQL agregado en Postgres), que recibe un alcance ya resuelto.

### Analíticas del Negocio (#272)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/analytics/businesses` | sí | Los Negocios no dados de baja donde el Usuario es Empleado vigente: `200 [{ id, name, isOwner }]`, el suyo primero y los demás por nombre; `[]` si no es Empleado de ninguno |
| GET | `/analytics/businesses/:businessId?from&to&branchId=<id>?&serviceId=<id>?&employeeId=<id>?` | sí | Las mismas analíticas que `/analytics/personal`, de los Servicios del Negocio (ocultos y dados de baja incluidos) |
| GET | `/analytics/businesses/:businessId/employees-per-period?from&to&granularity=day\|week\|month&branchId=<id>?&serviceId=<id>?` | sí | Solo para el Dueño: los Turnos de cada Empleado por período |
| GET | `/analytics/personal/bookings.csv?from&to&serviceId=<id>?` | sí | El CSV de Turnos de los Servicios personales del Usuario en el rango (#282) |
| GET | `/analytics/businesses/:businessId/bookings.csv?from&to&branchId=<id>?&serviceId=<id>?&employeeId=<id>?` | sí | El CSV de Turnos del Negocio en el rango y con los filtros (#282) |

- Respuesta 200: la misma forma que la personal (`kpis`, `granularity`, `trend`, `popularServices`, `recentRatings`, `filterOptions`) con estas diferencias:
  - `recentRatings[].employeeName` trae el nombre del Empleado que atendió el Turno.
  - `filterOptions`: `{ branches: {id,name}[], services: {id,name}[], employees?: {id,name}[] }`. Los Servicios incluyen los ocultos y los dados de baja; `employees` (los vigentes) viene solo para el Dueño.
  - Solo para el Dueño: `mostBookedEmployees`, `leastBookedEmployees` y `mostCancelledEmployees`, cada uno `{ employeeId, name, imageUrl, count }[]` con un top 5 de Empleados vigentes (los dados de baja no aparecen). Más y menos reservados cuentan Turnos con `startsAt` en el rango, sin Rechazados ni originales reagendados; los menos reservados incluyen a los que tienen 0, los más reservados no. Más Cancelaciones cuenta los Cancelados (sin los reagendados) por `cancelledAt`, sin los que tienen 0. Desempate por nombre y luego id. Respetan `branchId` y `serviceId` e ignoran `employeeId`. Un Empleado que no es Dueño no recibe estos tres campos.
- **Quién ve qué**: el Dueño ve todo el Negocio; un Empleado que no es Dueño ve solo los Turnos que atiende en ese Negocio (aunque sea Empleado de otros, que no se mezclan). `branchId`, `serviceId` y `employeeId` acotan además; los Servicios dados de baja y los Empleados dados de baja siguen valiendo como filtro (son historial).
- **Zona horaria**: cada Turno se corta en la zona de su Sucursal, no en la de una Availability. Las reglas de conteo son las de `/analytics/personal`.
- Errores:
  - 401 sin Sesión
  - 400 `Invalid analytics range <from>..<to>`: el rango no es válido (igual que la personal); 400 también si un filtro no es un número
  - 404 `Business <id> not found`: el Negocio no existe o está dado de baja
  - 403 `Only Employees of Business <id> can see its analytics`: el Usuario no es Empleado vigente del Negocio
  - 403 `Only the owner can filter by Employee`: un Empleado que no es Dueño manda `employeeId`
  - 404 `Branch <id> not found` / `Service <id> not found` / `Employee <id> not found`: el filtro no es del Negocio
- El alcance de Negocio (`kind: 'business'`, con `branchId` y `employeeId` opcionales; el caso de uso fuerza `employeeId` al del Usuario si no es Dueño) lo resuelve el caso de uso y lo cuenta el mismo `AnalyticsRepository`.
- El front muestra los rankings solo si vienen en la respuesta, y el filtro por Empleado solo si viene `filterOptions.employees`; usa `GET /analytics/businesses` para el selector de Negocio y para decidir si muestra el hero "Crear Negocio".

#### Turnos por Empleado y período (#273)

- Respuesta 200: `{ buckets: string[], rows: { employeeId, name, imageUrl, counts: number[] }[] }`. `buckets` son los inicios (`YYYY-MM-DD`) de todos los períodos del rango, el primero el que contiene a `from`; `counts[i]` es de `buckets[i]`.
- La granularidad la elige quien pide (`day`, `week` o `month`), no el largo del rango. La semana arranca en el `weekStart` del Usuario.
- Cuenta Turnos con `startsAt` en el período, sin Rechazados ni originales reagendados, cortados en la zona de su Sucursal. Una fila por Empleado vigente, incluso con todo en 0, por nombre y luego id. Respeta `branchId` y `serviceId`.
- Errores: 401 sin Sesión; 403 `Only the owner can see analytics per Employee` si el Usuario no es el Dueño; 400 `Invalid granularity <x>` si no es `day`, `week` ni `month` (`undefined` si falta); los mismos 400 (rango, filtro que no es un número) y 404 (Negocio, Sucursal, Servicio) de `GET /analytics/businesses/:businessId`.
- El front vuelve a pedir el endpoint al cambiar Por día / Por semana / Por mes; la búsqueda por nombre la hace el front.

#### CSV de Turnos (#274, #282)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| GET | `/analytics/personal/bookings.csv?from&to&serviceId=<id>?` | sí | Un CSV con una fila por Turno de los Servicios personales del Usuario |
| GET | `/analytics/businesses/:businessId/bookings.csv?from&to&branchId=<id>?&serviceId=<id>?&employeeId=<id>?` | sí | Un CSV con una fila por Turno del Negocio |

- Usan los mismos permisos, el mismo alcance y los mismos filtros que su par JSON (`/analytics/personal`, `/analytics/businesses/:businessId`): un Empleado que no es Dueño recibe solo sus Turnos. Los errores son los de su par JSON, con sus mismos mensajes (401, 400 `Invalid analytics range <from>..<to>`, 404, 403, 422).
- Respuesta 200 `text/csv; charset=utf-8`, con BOM UTF-8 (para que Excel lea los acentos), `Content-Disposition: attachment; filename="turnos-<from>-<to>.csv"` y líneas CRLF. El escape sigue RFC 4180: una celda con coma, comilla o salto de línea va entre comillas, y las comillas se duplican.
- **Filas**: cada Turno cuyo `startsAt` local cae en el rango (en la zona de la Availability predeterminada en lo personal, en la de la Sucursal de cada Turno en el Negocio), incluidos los originales reagendados y los Rechazados, ordenados por `startsAt` y luego por id.
- **Columnas** (encabezado en castellano): `Fecha y hora` (local, `YYYY-MM-DD HH:mm`), `Servicio`, `Sucursal` (vacía en personal), `Empleado` (vacío en personal), `Cliente`, `Email`, `Estado` (`Pendiente`, `Aceptado`, `Rechazado`, `Cancelado` o `Reagendado`: un original reagendado es `Reagendado`, no `Cancelado`), `Atendido` (`Sí`/`No`, la regla del KPI `attended`), `Ausencia` (`Sí`/`No`), `Falta del Empleado` (`Sí`/`No`), `Precio` (el del Turno, con punto decimal) y `Calificación` (el `score`, vacío si no tiene).
- El front arma el nombre `turnos-<from>-<to>.csv` él mismo y no lee el header.
- El front baja el archivo por una acción de servidor que reenvía el token; no es un link directo a la API.

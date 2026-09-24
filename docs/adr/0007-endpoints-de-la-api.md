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
| POST | `/businesses` | sí | Crea un negocio junto con su primera sucursal, servicio y empleado (alta todo-en-uno); 409 si el Usuario ya es Dueño de un Negocio (ADR 0012) |
| PATCH | `/businesses/:id` | sí | Actualiza name/description/slug (solo el dueño); cambiar el slug deja de servir el Enlace de reserva anterior |
| GET | `/businesses` | sí | Lista solo los negocios del Dueño de la sesión (0 o 1) |
| GET | `/businesses/:id` | no | Detalle de un negocio |
| GET | `/businesses/by-slug/:slug` | no | Detalle de un negocio por su Enlace de reserva; el slug se compara en minúsculas; 404 si no existe |

- `CreateBusinessDto`: `{ business: { name, description, slug }, branch: CreateBranchDto, service: ServiceFieldsDto }`
- `UpdateBusinessDto`: `{ name?, description?, slug? }`
- `slug` (Enlace de reserva): se pasa a minúsculas, 3-40 caracteres, palabras de letras y dígitos unidas por guiones (`^[a-z0-9]+(-[a-z0-9]+)*$`); formato inválido → 400, slug ya tomado → 409
- Respuesta (`presentBusiness`): `{ id, name, description, slug, ownerId }`
- Respuesta del POST: `{ business, branch, service, employee }` (cada uno con su propio presenter)

## Branches (Sucursal)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/businesses/:businessId/branches` | sí | Crea una sucursal bajo un negocio (solo el dueño) |
| PATCH | `/branches/:id` | sí | Actualiza una sucursal (solo el dueño) |
| GET | `/businesses/:businessId/branches` | no | Lista sucursales de un negocio |

- `CreateBranchDto`: `{ name, address, opensAt: "HH:mm", closesAt: "HH:mm" }`
- `UpdateBranchDto`: los mismos campos, todos opcionales
- Respuesta (`presentBranch`): `{ id, businessId, name, address, opensAt, closesAt }`

## Services (Servicio)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/branches/:id/services` | sí | Crea un servicio bajo una sucursal, con asignación inicial de empleados (solo el dueño) |
| PATCH | `/services/:id` | sí | Actualiza un servicio (solo el dueño) |
| DELETE | `/services/:id` | sí | Da de baja (soft-delete) un servicio (solo el dueño) |
| POST | `/services/:id/employees` | sí | Asigna un empleado a un servicio (solo el dueño) |
| DELETE | `/services/:id/employees/:employeeId` | sí | Quita un empleado de un servicio (solo el dueño) |
| GET | `/branches/:id/services` | no | Lista servicios activos de una sucursal |

- `CreateServiceDto`: `{ name, description?, category, durationMinutes (int ≥1), price (number ≥0), employeeIds: number[] (no vacío) }`
- `UpdateServiceDto`: `{ name?, description?, category?, durationMinutes?, price? }`
- `AssignEmployeeDto`: `{ employeeId }`
- Respuesta (`presentService`): `{ id, branchId, name, description, category, durationMinutes, price, employees: [{id, name}] }`
- `category` es un enum fijo: `CLINICA | SPA | GIMNASIO | ACADEMIA | OTRO`, requerido en creación

## Employees (Empleado)

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| POST | `/businesses/:id/employees` | sí | Agrega un empleado a un negocio (solo el dueño); 201 con el empleado, 409 si su email ya está en el negocio |
| PATCH | `/employees/:id` | sí | Actualiza el name del empleado (solo el dueño) |
| DELETE | `/employees/:id` | sí | Da de baja (soft-delete) un empleado (solo el dueño) |
| GET | `/businesses/:id/employees` | sí | Lista empleados de un negocio (solo el dueño) |

- `CreateEmployeeDto`: `{ name, email }`
- `UpdateEmployeeDto`: `{ name }`
- Respuesta (`presentEmployee`): `{ id, name, email }` — vista del dueño; en el array
  `employees` de un Service la vista pública es solo `{ id, name }`.

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

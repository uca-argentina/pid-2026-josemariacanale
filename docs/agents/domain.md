# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase. Front (`agendic-front/`) and back (`agendic-back/`) live in this one repo and share one glossary and one ADR series.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root: the Agendic glossary, shared by front and back. There is no per-app glossary and no `CONTEXT-MAP.md`.
- **`docs/adr/`** at the repo root: read the ADRs that touch the area you're about to work in. One series covers the whole system; an ADR that only binds one app says so in its text.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Code identifiers

The glossary is in Spanish; code is in English, in both apps (ADR 0003). Each term has exactly one identifier, the same one on both sides. Add a row when a new glossary term reaches the code; if front and back ever have to differ on a term, say so in that row.

| Glosario | Code |
| --- | --- |
| Negocio | `Business` |
| Dueño | `owner` (`Business.ownerId`) |
| Enlace de reserva | `Business.slug` (tramo del Negocio) + `Branch.slug` (tramo de la Sucursal, único por `businessId`); la URL del front, sin prefijo (ADR 0026), es `/<negocio-slug>/<sucursal-slug>`, y `/<negocio-slug>/<sucursal-slug>/<servicio-slug>` con el tramo del Servicio (`Service.slug`, único por `branchId` entre los no dados de baja) |
| Primer tramo del Enlace de reserva (ADR 0026) | `BookingSlug` (`slug` clave primaria, `businessId` o `userId`, exactamente uno; la escriben `PrismaBusinessesRepository` y `PrismaUsersRepository` con el slug); palabras reservadas → `RESERVED_SLUGS`; `GET /slugs/:slug` → `ResolveSlugUseCase`; en el front, `ResolvedBookingLink` (`kind: 'business' \| 'user'`), `resolveBookingLinkController` y `resolveBookingLink` (`app/[slug]/_components`), que elige la página del primer tramo |
| Sucursal | `Branch` (sin horario de apertura ni de cierre; descripción propia opcional → `Branch.description`) |
| Logo del Negocio | `Business.logoUrl` (`string \| null`; `PUT` / `DELETE /businesses/:id/logo`) |
| Imágenes de Sucursal | `BranchImage` (`url`, `order`) |
| Cabina (ADR 0030) | `Cabin` (`branchId`, `name` único sin mayúsculas por Sucursal entre las no dadas de baja, `deletedAt`); las que admite un Servicio → `ServiceCabin` (`cabinIds` en el body, `cabins` en la vista del panel); la que ocupa un Turno → `Booking.cabinId` (`cabin` en las vistas del panel, nunca en `ClientBooking`) |
| Zona horaria | `Branch.timeZone` |
| Usuario | `User` (foto de perfil → `User.imageUrl`, la de Clerk al crearse) |
| Preferencias del Usuario | `User.timeFormat` (`12 \| 24`, por defecto 24) y `User.weekStart` (0 = domingo … 6, por defecto 1 = lunes); en el front, `Preferences` y el diálogo `PreferencesDialog` del menú de Usuario |
| Cliente | `Client` (`name`, `email`; una fila por Turno vía `Client.bookingId`, índice no único sobre `email`); la API sigue exponiendo `clientName` / `clientEmail` en el Turno |
| Empleado elegido (ADR 0026) | `Booking.employeeChosen` (`boolean`, por defecto `false`); `employeeId` en `GET /services/:id/slots` y en `POST /bookings`; el Enlace de reserva de ese Empleado es `User.slug`, que `employees[].slug` expone; en el front, `bookingLinkPath(negocio, sucursal, servicio, empleado)` arma la URL, `PublicBranchScreen` busca al Empleado por ese tramo (`selectedEmployee`, 404 si no Ofrece el Servicio) y `BookingFlow` recibe `employee`; `ClientBooking` y `UserBooking` traen `employeeChosen` |
| Quien atiende un Turno | `Booking.userId` (siempre); `Booking.employeeId` solo en un Servicio del Negocio |
| Empleado | `Employee` |
| Invitación | `Invitation` (`email`, `expiresAt`) |
| Availability | `Availability` (predeterminada → `isDefault`; zona horaria → `Availability.timeZone`; es del Usuario, `userId`) |
| Franja | `AvailabilityInterval` (días → `days`, 0 = domingo como `dayjs().day()`, varios por Franja; inicio/fin → `startTime`/`endTime`) |
| Anulación | `AvailabilityOverride` (`availabilityId`) |
| Fuera de la oficina (ADR 0027) | `OutOfOffice` (`userId`; `startDate` / `endDate` como fechas sin hora, inclusivas; `notes` opcional; `showNotePublicly`, por defecto `false`; `GET/POST /users/me/out-of-office`, `PUT/DELETE /users/me/out-of-office/:id`) |
| Motivo | `OutOfOfficeReason` (`UNSPECIFIED \| VACATION \| TRAVEL \| SICK_LEAVE \| PUBLIC_HOLIDAY`; el emoji y la etiqueta viven en el front) |
| Día festivo (ADR 0027) | `Holiday` (`HolidayCache`: `countryCode`, `calendarId`, `eventId`, `name`, `date`, `year`; el país elegido y los apagados del Usuario → `UserHolidaySettings`: `userId` único, `countryCode`, `disabledIds`); puerto `GoogleCalendarClient`, `GetHolidaysForCountryUseCase`; `GET /holidays/countries` → `ListHolidayCountriesUseCase`; `GET/PUT /users/me/holidays`, `PATCH /users/me/holidays/:holidayId`, `GET /users/me/holidays/conflicts` |
| Horario reservable | `Slot` (`GET /services/:id/slots`) |
| Servicio | `Service` |
| Servicio personal (ADR 0021) | `PersonalService` (`Service.userId`, `Service.availabilityId`; sin `branchId`; Enlace de reserva `User.slug`, la URL del front es `/<slug>/<servicio>`) |
| Servicio personal | `Service.userId` (con `Service.availabilityId`; sin `branchId` ni Empleados) |
| Servicio del Negocio | `Service.branchId` (sin `userId`) |
| Enlace de reserva del Usuario | `User.slug`; la URL del front es `/<usuario-slug>`, y `/<usuario-slug>/<servicio-slug>` con el tramo del Servicio personal (`Service.slug`, único por `userId` entre los no dados de baja) |
| Categoría de Servicio | `ServiceCategory` (`Service.category`) |
| Aprobación manual | `Service.requiresApproval` |
| Seña | `Service.depositPercent` (opcional) |
| Seña pendiente | `Booking.depositAmount` (monto fijado al Reservar: precio × `depositPercent` / 100 redondeado al centavo; `null` sin Seña) y `Booking.depositPaidAt` (`null` mientras no se paga); Seña pendiente = `depositAmount !== null && depositPaidAt === null` |
| Servicio oculto | `Service.hidden` |
| Tiempo de preparación | `Service.prepMinutes` (0 = sin preparación); en el Turno, `Booking.prepStartsAt` (desde cuándo ocupa al Empleado) |
| Límite diario | `Service.dailyLimit` (opcional) |
| Intervalo | `Service.slotInterval` (minutos, opcional; sin él, `durationMinutes`) |
| Anticipación mínima | `Service.minimumNoticeMinutes` (minutos, 0 = sin anticipación) |
| Ofrecer un Servicio / dejar de ofrecerlo | `assignEmployee` / `removeEmployee` (`EmployeeService`) |
| Turno | `Booking` (inicio/fin → `startsAt`/`endsAt`; estado → `BookingStatus.PENDING \| BOOKED \| REJECTED \| CANCELLED`) |
| Comentario del Turno | `Booking.notes` (opcional) |
| Enlace del Turno (ADR 0022) | `Booking.link` (secreto, único, generado al crear); `POST /bookings` lo devuelve como `link`; `GET/PATCH /booking-links/:secret` responden el Turno con `ClientBooking` (incluye `user: { slug } \| null`, el Enlace de reserva del Usuario en un Servicio personal); en el front, `getBookingByLink` / `cancelBookingByLink` / `rescheduleBookingByLink` y la ruta `/turnos/<link>` |
| Reservar de nuevo | `bookAgainPath` (`app/routes.ts`), el botón `BookAgainLink` al pie de `/turnos/<link>` |
| Aviso de cambio del Turno | `Mailer.sendBookingCancellation` / `sendBookingReschedule` / `sendBookingRejection` (`notifyClients`: un mail que falla se loguea y no deshace el cambio) |
| Código de verificación del Turno | `BookingVerificationCodes` (ADR 0006, 0022); en el front, las seis casillas de `CodeStep` sobre `code-input.ts` |
| Turno pendiente | `BookingStatus.PENDING` |
| Aceptar turno | `accept` (`PENDING` → `BOOKED`) |
| Rechazar turno | `reject` (`PENDING` → `REJECTED`) |
| Ausencia | `Booking.noShowAt` (marcado a mano; no reemplaza `status`) |
| Reservar | `book` |
| Reagendar | `reschedule` (`RescheduleBookingUseCase`); por Enlace del Turno, `reschedulePendingOrBooked` (`RescheduleBookingByLinkUseCase`) |
| Pagar la Seña (ADR 0027) | `payDeposit`, `PayDepositByLinkUseCase`, `PATCH /booking-links/:secret/deposit`; en el front, `payDepositByLink` |
| Mis turnos del Usuario (ADR 0023) | `UserBooking` (`GET /users/me/bookings`) |
| Cancelar | `cancel` (del Empleado); por Enlace del Turno, `cancelPendingOrBooked` (también sobre `PENDING`) |
| Dar de baja | `retire` (`Service.deletedAt`, `Employee.deletedAt`); ADR 0024: `User.deletedAt` (`RetireMeUseCase`, `DELETE /users/me`; Clerk, `ClerkAuth.deleteUser`); `Business.deletedAt` (#122, la baja del Dueño lo marca) |
| Preferencias del Usuario (formato de hora y primer día de la semana, solo del panel) | `User.timeFormat` (`12 \| 24`, por defecto 24), `User.weekStart` (`0..6`, 0 = domingo como `dayjs().day()`, por defecto 1) |
| Sesión / Iniciar sesión / Cerrar sesión | `Session` / `signIn` / `signOut` |

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (endpoints de la API), but worth reopening because…_

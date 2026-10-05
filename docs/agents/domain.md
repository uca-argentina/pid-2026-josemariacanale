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
| Enlace de reserva | `Business.slug` (tramo del Negocio) + `Branch.slug` (tramo de la Sucursal, único por `businessId`); la URL del front es `/business/<negocio-slug>/<sucursal-slug>`, y `/business/<negocio-slug>/<sucursal-slug>/<servicio-slug>` con el tramo del Servicio (`Service.slug`, único por `branchId` entre los no dados de baja) |
| Sucursal | `Branch` (sin horario de apertura ni de cierre) |
| Imágenes de Sucursal | `BranchImage` (`url`, `order`) |
| Zona horaria | `Branch.timeZone` |
| Usuario | `User` |
| Cliente | `Booking.clientName` / `Booking.clientEmail` |
| Empleado | `Employee` |
| Invitación | `Invitation` (`email`, `expiresAt`) |
| Availability | `Availability` (predeterminada → `isDefault`; zona horaria → `Availability.timeZone`; es del Usuario, `userId`) |
| Franja | `AvailabilityInterval` (días → `days`, 0 = domingo como `dayjs().day()`, varios por Franja; inicio/fin → `startTime`/`endTime`) |
| Anulación | `AvailabilityOverride` (`availabilityId`) |
| Horario reservable | `Slot` (`GET /services/:id/slots`) |
| Servicio | `Service` |
| Categoría de Servicio | `ServiceCategory` (`Service.category`) |
| Aprobación manual | `Service.requiresApproval` |
| Seña | `Service.depositPercent` (opcional) |
| Servicio oculto | `Service.hidden` |
| Tiempo de preparación | `Service.prepMinutes` (0 = sin preparación); en el Turno, `Booking.prepStartsAt` (desde cuándo ocupa al Empleado) |
| Límite diario | `Service.dailyLimit` (opcional) |
| Intervalo | `Service.slotInterval` (minutos, opcional; sin él, `durationMinutes`) |
| Anticipación mínima | `Service.minimumNoticeMinutes` (minutos, 0 = sin anticipación) |
| Ofrecer un Servicio / dejar de ofrecerlo | `assignEmployee` / `removeEmployee` (`EmployeeService`) |
| Turno | `Booking` (inicio/fin → `startsAt`/`endsAt`; estado → `BookingStatus.UNVERIFIED \| PENDING \| BOOKED \| REJECTED \| CANCELLED`) |
| Comentario del Turno | `Booking.notes` (opcional) |
| Turno sin verificar | `BookingStatus.UNVERIFIED` |
| Turno pendiente | `BookingStatus.PENDING` |
| Aceptar turno | `accept` (`PENDING` → `BOOKED`) |
| Rechazar turno | `reject` (`PENDING` → `REJECTED`) |
| Ausencia | `Booking.noShowAt` (marcado a mano; no reemplaza `status`) |
| Reservar | `book` |
| Reagendar | `reschedule` (`RescheduleBookingUseCase`) |
| Mis turnos del Empleado | `EmployeeBooking` (`GET /employees/me/bookings`) |
| Cancelar | `cancel` |
| Dar de baja | `retire` (`Service.retiredAt`, `Employee.retiredAt`) |
| Sesión / Iniciar sesión / Cerrar sesión | `Session` / `signIn` / `signOut` |

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (endpoints de la API), but worth reopening because…_

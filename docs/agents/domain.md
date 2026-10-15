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
| Empleado elegido (ADR 0026, 0029) | `Booking.employeeChosen` (`boolean`, por defecto `false`); `employeeId` en `GET /services/:id/slots` y en `POST /bookings`; el Enlace de reserva de ese Empleado es `User.slug`, que `employees[].slug` expone; en el front, `bookingLinkPath(negocio, sucursal, servicio, empleado)` arma la URL, `PublicBranchScreen` busca al Empleado por ese tramo (`selectedEmployee`, 404 si no Ofrece el Servicio) y `BookingFlow` recibe `employee`; el Empleado del borrador de la reserva es `BookingDraft.employee` (`null` = Cualquiera) y el selector es el componente `EmployeePicker`, que arranca preseleccionado con el del enlace y deja cambiarlo (ADR 0029); `ClientBooking` y `UserBooking` traen `employeeChosen` |
| Quien atiende un Turno | `Booking.userId` (siempre); `Booking.employeeId` solo en un Servicio del Negocio |
| Empleado | `Employee` |
| Invitación | `Invitation` (`email`, `expiresAt`) |
| Availability | `Availability` (predeterminada → `isDefault`; zona horaria → `Availability.timeZone`; es del Usuario, `userId`) |
| Franja | `AvailabilityInterval` (días → `days`, 0 = domingo como `dayjs().day()`, varios por Franja; inicio/fin → `startTime`/`endTime`) |
| Anulación | `AvailabilityOverride` (`availabilityId`) |
| Causa de cancelación (ADR 0034) | `CancellationCause` (`OUT_OF_OFFICE \| PUBLIC_HOLIDAY \| SCHEDULE_CHANGE`); `Booking.cancellationCause` (opcional; CHECK `Booking_cancellationCause_only_with_reason`); el texto lo arma `cancellationReasonFor` (módulo puro de `domain/bookings`) y es el Motivo de cancelación, `Booking.cancellationReason`, que escribe Agendic y ve el Cliente; el panel (`UserBooking` y el resto de las respuestas del panel, no `ClientBooking`) trae `cancellationCause` |
| Turnos que quedan afuera (ADR 0034) | `bookingsLeftOutside(bookings, before, after)` (módulo puro de `domain/slots`; `UserSchedule`: `availabilities` y `blocked` de `BlockedPeriod`); la regla de "dentro" es la de `computeSlots`, con `dayRangesReader` compartido; los Turnos que mira → `BookingsRepository.listUpcomingByUser(userId, from, to?)` (`UpcomingBooking`) |
| Vista previa de Turnos que quedan afuera (#326) | `POST /users/me/out-of-office/preview` → `PreviewOutOfOfficeUseCase`; `LeftOutsideBookingsService.forOutOfOffice` arma el horario de antes y de después y le pone Causa y Motivo (`LeftOutsideBooking`); `cancelBookingIds` en el body de `POST /users/me/out-of-office` confirma cuáles; `OutOfOfficeRepository.createCancelling(userId, data, CausedCancellationOrder[], now)` guarda el período y cancela en una transacción (`cancelCaused`); `notifyCausedCancellations` manda el Aviso con Causa, uno por Serie o por Turno; #328, al editar: `POST /users/me/out-of-office/:id/preview` → `PreviewEditOutOfOfficeUseCase`, `LeftOutsideBookingsService.forOutOfOffice(userId, period, replacing?)` (`replacing` es el período como estaba: cuenta en el horario de antes y lo reemplaza `period` en el de después), `cancelBookingIds` también en el body de `PUT /users/me/out-of-office/:id` y `OutOfOfficeRepository.updateCancelling` |
| Guardar una Availability cancela los Turnos que deja afuera (#329) | `POST /availabilities/:id/preview` → `PreviewAvailabilityUseCase`; `LeftOutsideBookingsService.forAvailability(userId, current, replacement)` (solo los Turnos con `availabilityId` igual al de `current`, todos los futuros; Causa `SCHEDULE_CHANGE`); `cancelBookingIds` en el body de `PUT /availabilities/:id` (`ConfirmedAvailabilityDto`), que responde además `cancelledBookings`, y `AvailabilitiesRepository.replaceCancelling(id, data, CausedCancellationOrder[], now)` |
| Días festivos cancelan los Turnos que dejan afuera (#330) | `POST /users/me/holidays/preview` → `SetUserHolidayCountryUseCase.preview` y `POST /users/me/holidays/:holidayId/preview` → `ToggleUserHolidayUseCase.preview`; `LeftOutsideBookingsService.forHolidays(userId, settings, onDate?)` (Causa `PUBLIC_HOLIDAY`, el nombre del Día festivo en el Motivo de cancelación); el horario de después sale de `ListUserHolidayPeriodsUseCase.forSettings` (estricto, todos los años del rango); `cancelBookingIds` en el body de `PUT` y `PATCH`, que responden además `cancelledBookings`, y `UserHolidaySettingsRepository.saveCancelling(userId, settings, CausedCancellationOrder[], now)` |
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
| Precio del Turno | `Booking.price` (el precio del Servicio fijado al Reservar, como `depositAmount`; los cambios posteriores al Servicio no lo tocan) |
| Cuándo se Canceló o Rechazó un Turno | `Booking.cancelledAt` (al Cancelar, de cualquier forma, incluida Dar de baja) y `Booking.rejectedAt` (al Rechazar turno); `null` fuera de su estado, lo garantiza un CHECK (ADR 0004); la API todavía no los expone |
| Seña pendiente | `Booking.depositAmount` (monto fijado al Reservar: precio × `depositPercent` / 100 redondeado al centavo; `null` sin Seña) y `Booking.depositPaidAt` (`null` mientras no se paga); Seña pendiente = `depositAmount !== null && depositPaidAt === null` |
| Servicio oculto | `Service.hidden` |
| Tiempo de preparación | `Service.prepMinutes` (0 = sin preparación); en el Turno, `Booking.prepStartsAt` (desde cuándo ocupa al Empleado) |
| Límite diario | `Service.dailyLimit` (opcional) |
| Intervalo | `Service.slotInterval` (minutos, opcional; sin él, `durationMinutes`) |
| Repetición (#301) | `Service.repeatEveryWeeks` (semanas entre Turnos, ≥ 1) y `Service.repeatMaxBookings` (Turnos máximos de una Serie, 2 a 10); los dos con valor o los dos `null`, con los CHECK `Service_repeat_both_or_neither`, `Service_repeatEveryWeeks_min` y `Service_repeatMaxBookings_range`; `PATCH /services/:id` con los dos en `null` la saca |
| Fechas de una Serie (#302) | `seriesDates` (`domain/slots/series.ts`, pura: misma hora local cada `repeatEveryWeeks` semanas), `ListSeriesSlotsUseCase`, `GET /services/:id/series-slots` → `{ employeeId, dates: SeriesSlot[] }` (`available: false` = choque) |
| Serie (#303) | `Booking.seriesId` (uuid, `null` en un Turno suelto, indexado; lo genera `BookingsRepository.createSeries` y Reagendar lo copia); `POST /bookings` con `repeat` (`CreateBookingInput.repeat`: `SeriesRepeat` `{ count, skipDates? }`) → `CreateBookingSeriesUseCase`, que responde `series: { id, bookings: { startsAt, link }[] }`; el 409 `Series dates not available: <fechas>` → `seriesDatesNotAvailable`; `freeCabinsInOrder` (`pick-cabin.ts`) ordena las Cabinas libres por la regla de la ADR 0030; sale en `presentBooking` y `presentUserBooking`; #304: `Mailer.sendBookingConfirmation(email, link, depositAmount, series?)` lista todas las fechas y Enlaces en un solo mail, y `ClientBooking.series` (`SeriesBooking`: `startsAt`, `status`, `link`; `null` en un Turno suelto) sale en `GET /booking-links/:secret` y en las respuestas de `/booking-links/:secret/...` |
| Acciones sobre la Serie (#305) | `BookingsRepository.resolvePendingSeries` (Aceptar y Rechazar la Serie), `cancelSeriesFrom` y `cancelSeriesFromByLink` (Cancelar este y los siguientes; el segundo por Enlace del Turno); `ResolvePendingSeriesUseCase`, `CancelBookingSeriesUseCase`, `CancelBookingSeriesByLinkUseCase`; body `{ series }` en `accept` y `reject`, `{ andFollowing }` en `cancel` y `booking-links/:secret/cancel`; `serieOf` (422 `Turno <id> is not part of a Serie`); `notifySeries` manda un solo Aviso de cambio del Turno, con `SeriesNotice` como cuarto parámetro de `Mailer.sendBookingCancellation` / `sendBookingRejection` |
| Anticipación mínima | `Service.minimumNoticeMinutes` (minutos, 0 = sin anticipación) |
| Ofrecer un Servicio / dejar de ofrecerlo | `assignEmployee` / `removeEmployee` (`EmployeeService`) |
| Turno | `Booking` (inicio/fin → `startsAt`/`endsAt`; estado → `BookingStatus.PENDING \| BOOKED \| REJECTED \| CANCELLED`) |
| Comentario del Turno | `Booking.notes` (opcional) |
| Enlace del Turno (ADR 0022) | `Booking.link` (secreto, único, generado al crear); `POST /bookings` lo devuelve como `link`; `GET/PATCH /booking-links/:secret` responden el Turno con `ClientBooking` (incluye `user: { slug } \| null`, el Enlace de reserva del Usuario en un Servicio personal); en el front, `getBookingByLink` / `cancelBookingByLink` / `rescheduleBookingByLink` y la ruta `/turnos/<link>` |
| Reservar de nuevo | `bookAgainPath` (`app/routes.ts`), el botón `BookAgainLink` al pie de `/turnos/<link>` |
| Aviso de cambio del Turno | `Mailer.sendBookingCancellation` / `sendBookingReschedule` / `sendBookingRejection` (`notifyClients`: un mail que falla se loguea y no deshace el cambio) |
| Aviso de cambio del Turno con Causa | `Mailer.sendBookingCancellationWithCause(email, bookings: CausedCancellation[])` (`link`, `serviceName`, `startsAt`, `timeZone`, `reason`): un solo mail por acción, con uno o más Turnos; el Motivo va una vez si es el mismo en todos |
| Código de verificación del Turno | `BookingVerificationCodes` (ADR 0006, 0022); en el front, las seis casillas de `CodeStep` sobre `code-input.ts` |
| Turno pendiente | `BookingStatus.PENDING` |
| Aceptar turno | `accept` (`PENDING` → `BOOKED`) |
| Rechazar turno | `reject` (`PENDING` → `REJECTED`) |
| Turno reagendado (ADR 0031) | Reagendar cancela el Turno original (`Booking.rescheduled = true`, `status` `CANCELLED`, sin `Booking.link`) y crea uno nuevo con `Booking.fromRescheduleId` = id del original, que hereda el Enlace del Turno; `GET /users/me/bookings` trae `fromRescheduleId` y ni esa lista ni `GET /businesses/:id/bookings` devuelven los originales |
| Motivo de cancelación (ADR 0033) | `Booking.cancellationReason` (opcional, hasta 500 caracteres; solo con `cancelledBy`, CHECK); quién cancela → `Booking.cancelledBy` (`BookingActor` = `EMPLOYEE \| CLIENT \| RETIREMENT`, solo con `status` `CANCELLED` o `REJECTED`, CHECK; `null` en los Turnos cancelados antes de que existiera); cuándo se Aceptó → `Booking.acceptedAt` (también al nacer `BOOKED`); `CancelBookingDto` (body `{ reason? }`) y `reasonOf`; `Mailer.sendBookingCancellation` / `sendBookingRejection` reciben el motivo |
| Historial del Turno (ADR 0033) | `BookingHistoryEntry` (`type`, `at`, `actor`, `reason`, `from`), `buildBookingHistory` (puro, sobre la cadena `HistoryBooking`), `BookingsRepository.findHistoryChain`, `GetBookingHistoryUseCase`, `GET /bookings/:id/history` |
| Ausencia del Invitado (ADR 0032) | `Booking.noShowAt` (marcado a mano; no reemplaza `status`); desmarcar → `UnmarkNoShowUseCase`, `DELETE /bookings/:id/no-show`, `BookingsRepository.unmarkNoShow` |
| Ausencia del Anfitrión (ADR 0032) | `Booking.employeeNoShowAt` (la marca el Cliente; no reemplaza `status`; excluye a `noShowAt` con el CHECK `Booking_no_show_exclusive`, ADR 0004); `MarkEmployeeNoShowByLinkUseCase`, `PATCH /booking-links/:secret/employee-no-show`; `ClientBooking.canMarkEmployeeNoShow` lo calcula el back |
| Calificación | `BookingRating` (`bookingId` único, `score` de 1 a 5 con el CHECK `BookingRating_score_range`, `comment` opcional, `createdAt`; ADR 0004); `RateBookingByLinkUseCase`, `POST /booking-links/:secret/rating`; `ClientBooking.rating` y `ClientBooking.canRate`, que calcula el back (`ratingBlocker`) |
| Analíticas (#264) | `Analytics`; puerto `AnalyticsRepository` (`kpis(scope, range, now, serviceId?)`, el único lugar que sabe contar; alcance `AnalyticsScope` (`kind: 'personal'` o `'business'`)), adapter `PrismaAnalyticsRepository` con SQL agregado; KPI → `KpiName` (`booked`, `attended`, `rescheduled`, `cancelled`, `rejected`, `pending`, `noShows`, `employeeNoShows`, `averageRating`, `csat`, `revenue`); `GetPersonalAnalyticsUseCase`, `GET /analytics/personal`; #271: `AnalyticsRepository.breakdown` (tendencia → `trend` de `TrendPoint`, por `Granularity` `day \| week \| month`; `popularServices`; `recentRatings`) y `personalServices` (→ `filterOptions.services`); #272: alcance `AnalyticsScope` `kind: 'business'` (`businessId`, `branchId?`, `employeeId?`, forzado al Empleado si no es Dueño), `GetBusinessAnalyticsUseCase` (`GET /analytics/businesses/:businessId`), `ListAnalyticsBusinessesUseCase` (`GET /analytics/businesses`), `AnalyticsRepository.employeeRankings` (→ `mostBookedEmployees`, `leastBookedEmployees`, `mostCancelledEmployees`) y `businessServices` (→ `filterOptions.services`); #273: `AnalyticsRepository.employeesPerPeriod` (→ `EmployeesPerPeriod`: `buckets` y `rows[].counts`), `GetEmployeesPerPeriodUseCase`, `GET /analytics/businesses/:businessId/employees-per-period`; #274: `AnalyticsRepository.bookingRows` (→ `BookingRow`), `bookingsCsv`, `ExportPersonalBookingsCsvUseCase` (`GET /analytics/personal/bookings.csv`), `ExportBusinessBookingsCsvUseCase` (`GET /analytics/businesses/:businessId/bookings.csv`) |
| CSV de Turnos, front (#282) | `BookingsCsvQuery` (sin `businessId` son los Servicios personales), `CsvFile` (`filename`, `content`); `AnalyticsRepository.downloadBookingsCsv`, `DownloadBookingsCsvUseCase`, `downloadBookingsCsvController` (nombra el archivo `turnos-<from>-<to>.csv`), `downloadBookingsCsvAction`; el botón `DownloadBookingsCsvButton` y `personalCsvQuery` / `businessCsvQuery` arman la consulta desde la URL |
| Invitación a calificar | `Booking.ratingRequestSentAt` (`null` mientras no se mandó; se guarda solo si el mail salió bien); `SendRatingRequestsUseCase` (reloj y `Mailer` por puerto), `RatingRequestsJob` (`@nestjs/schedule`, cada 15 minutos), `Mailer.sendRatingRequest`; Turnos con `endsAt` entre hace 7 días y hace 1 hora que pasan `ratingBlocker` |
| Anotación (ADR 0034, #355) | `WaitlistEntry` (`serviceId`, `date` sin hora en la zona del Servicio, `clientName`, `email` recortado y en minúsculas, `link` secreto, `notifiedAt`, `leftAt`; una viva por `lower(email)`, Servicio y fecha, con el unique parcial `WaitlistEntry_email_service_date_key`); puerto `WaitlistRepository`; `JoinWaitlistUseCase`, `POST /services/:id/waitlist`; en el front (#359), `IWaitlistRepository` / `WaitlistRepository`, `joinWaitlistUseCase`, `joinWaitlistController`, `joinWaitlistAction`, y `WaitlistFlow` / `FullDayPanel` en `app/_components/booking` |
| Salir de la Lista de espera (#356) | `LeaveWaitlistUseCase`, `POST /waitlist-links/:secret/leave`; abrir el enlace → `WaitlistEntryView`, `GetWaitlistEntryByLinkUseCase`, `GET /waitlist-links/:secret`; puerto `WaitlistRepository.findByLinkIncludeService` / `leave`; la ruta del front es `/lista-de-espera/<secreto>` (`RESERVED_SLUGS`) |
| Salir de la Lista de espera, front (#360) | `WaitlistEntryView`, `IWaitlistRepository.getByLink` / `leave`, `GetWaitlistEntryByLinkUseCase` / `LeaveWaitlistUseCase`, sus controllers y `leaveWaitlistAction`; la página `app/lista-de-espera/[link]` (`waitlistPath`, `LeaveWaitlistScreen`), con Reservar otro día → `bookOtherDayPath` |
| Confirmación de anotación | `Mailer.sendWaitlistConfirmation` (un mail que falla se loguea y no deshace la Anotación) |
| Aviso de horario libre (ADR 0034, #357) | `Mailer.sendFreeSlotNotice` (recibe el path del Enlace de reserva con `?fecha=&nombre=&email=` y el secreto de la Anotación); `SendFreeSlotNoticesUseCase` (reloj y `Mailer` por puerto, `ListSlotsUseCase` sin `employeeId`), `FreeSlotNoticesJob` (`@Cron` cada 5 minutos); `WaitlistRepository.listAliveIncludeService` (→ `AliveWaitlistEntry`) / `markNotified` / `rearm`; un mail que falla se loguea y se reintenta en la próxima vuelta |
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

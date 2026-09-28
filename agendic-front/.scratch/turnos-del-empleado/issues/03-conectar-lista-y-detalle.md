# 03: Conectar lista y detalle de "mis turnos" a datos reales

**Spec:** `../../../../.scratch/turnos-del-empleado/spec.md`
**ADR relevante:** `../../../../docs/adr/0007-endpoints-de-la-api.md`

**Dónde trabajar:** `agendic-front/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`),
reglas de esta app en `agendic-front/CLAUDE.md` (Clean Architecture, componentes de UI).

**What to build:** `app/(app)/bookings/page.tsx` y `app/(app)/bookings/[bookingId]/page.tsx` dejan
de leer `_components/mock-bookings.ts` directo y pasan a pedir los Turnos reales del Empleado
logueado, siguiendo el mismo patrón de capas que ya usa `app/(app)/business/`.

**Blocked by:** back ticket 02 (`GET /employees/me/bookings`).

**Contrato del back a consumir:**

- `GET /employees/me/bookings` — con Sesión (Bearer del Clerk JWT, mismo mecanismo que
  `businesses.repository.ts`). Sin body ni query. Devuelve un array de:
  `{ id, status: 'UNVERIFIED'|'PENDING'|'BOOKED'|'REJECTED'|'CANCELLED', startsAt, endsAt,
  clientName, clientEmail, noShowAt: string | null, serviceId, serviceName, businessId,
  businessName, branchId, branchName }`. Lista vacía si el Usuario no es Empleado activo de ningún
  Negocio (no es un error). 401 si no hay Sesión válida.

**Acceptance criteria:**

- [ ] Nuevo repositorio `infrastructure/repositories/bookings.repository.ts`: método que llama a
      `GET /employees/me/bookings` con el Bearer del Empleado logueado (mismo patrón que
      `businesses.repository.ts`: `ApiRequestError` en fallas de red o status no-OK, respuesta
      parseada con Zod).
- [ ] `app/(app)/bookings/page.tsx` pasa a Server Component que resuelve la Sesión
      (`getCurrentUser()`, redirect a sign-in si no hay) y pide la lista vía
      `getInjection('IListMyBookingsController')`. Deja de importar nada de `mock-bookings.ts`.
- [ ] `app/(app)/bookings/[bookingId]/page.tsx` pide la misma lista completa (mismo controlador) y
      busca el Turno por `id`; no encontrado → `notFound()`. No se agrega ningún endpoint de detalle
      nuevo.
- [ ] Los tabs existentes se remapean al `status` real: Pendientes = `PENDING`; Próximos = `BOOKED`
      con `startsAt` futuro; Pasados = `BOOKED` con `endsAt` pasado (mostrando la etiqueta de
      Ausencia cuando `noShowAt` no es null); Cancelados agrupa `CANCELLED` y `REJECTED`, cada uno
      con su propia etiqueta visible.
- [ ] Los filtros de Servicio, Sucursal/Negocio, nombre y email de Cliente siguen siendo
      client-side, sobre la lista completa ya traída (mismo patrón que hoy en el mock, sin cambiar
      contrato). Se saca el filtro de "empleado": en esta vista el Empleado siempre es el Usuario
      actual.
- [ ] `BookingsView.tsx` y `BookingDetail.tsx` reciben la lista/el Turno real como prop en vez de
      `initialBookings` mockeados; se borran `mock-bookings.ts` y cualquier tipo/dato que solo
      existía para simular esto (los helpers puros como agrupar por día/formatear horario se pueden
      mantener si siguen sirviendo sobre el tipo real).
- [ ] Tests unitarios por capa con puertos stubeados (mismo patrón que `app/(app)/business/`):
      página `bookings/` sin Sesión → redirect a sign-in, con Sesión → arma la lista pedida al
      controlador; página `bookings/[bookingId]` con Turno encontrado/no encontrado; adaptador de
      `bookings.repository.ts` (200 parseado con Zod, 401 mapeado a `UnauthenticatedError`).

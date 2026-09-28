# 07: Reserva real de Turno

**Spec:** `../../../../.scratch/reserva-real-por-sucursal/spec.md`
**ADR relevante:** `../../../../docs/adr/0007-endpoints-de-la-api.md`

**Dónde trabajar:** `agendic-front/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`), reglas de esta app en `agendic-front/CLAUDE.md`.

**What to build:** desde la página real de Sucursal (ticket 05), el Cliente elige Servicio, profesional y Horario reservable real, deja opcionalmente un Comentario del Turno, y confirma: se crea un Turno real contra el back, no un mock. `BookingFlow.tsx`, `TimeStep.tsx` y los tipos de `types.ts` dejan de simular esto.

**Blocked by:** 03 (back: `Booking.notes`), 05 (página real de Sucursal).

**Contrato del back a consumir:**

- `GET /services/:id/slots?employeeId&from&to` — sin Sesión. `employeeId` (int, requerido), `from`/`to` (`YYYY-MM-DD`, fechas locales de la Sucursal, inclusive, requeridos, hasta 31 días de rango). Devuelve `{ timeZone, days: [{ date, slots: [ISO instants], reason?, coveredByEmployeeId? }] }`. `reason` (`NOT_WORKING` | `FULLY_BOOKED` | `COVERED`) solo aparece cuando `slots` está vacío para ese día — mostrar ese motivo en vez de una grilla vacía sin explicación. 400 si falta algún query param o el formato es inválido; 422 si el rango supera 31 días o `to` es anterior a `from`; 404 si el Servicio no existe, está dado de baja, o el Empleado no atiende ese Servicio.
- `POST /bookings` — sin Sesión. Body: `{ serviceId, employeeId, startsAt: ISO date-string, clientName, clientEmail, notes? }` (`notes` lo agrega el ticket 03). Crea el Turno; consultar `docs/adr/0007-endpoints-de-la-api.md` vigente al momento de implementar para el estado exacto en el que nace (el back está evolucionando en paralelo el flujo de Aprobación manual/Turno pendiente) y mostrar el mensaje que corresponda a ese estado, no asumir que siempre es igual a "Turno sin verificar". 409 si el horario se ocupó entre que se mostró el Horario reservable y que se confirmó (choque de horario) — mostrar que hay que elegir otro horario, sin reportarlo al crash reporter (es esperable, no un bug). Otros 4xx/5xx siguen el mapeo estándar de errores de dominio.

**Acceptance criteria:**

- [ ] Elegir Servicio y profesional (de los ya listados en la página del ticket 05) dispara el pedido real de Horarios reservables para ese Servicio y ese profesional.
- [ ] Los días sin horarios muestran el motivo (`reason`) en vez de una grilla vacía sin explicación.
- [ ] Confirmar la reserva envía `clientName`, `clientEmail`, el horario elegido, y el Comentario del Turno si el Cliente escribió algo, contra `POST /bookings` real.
- [ ] El 409 de horario ocupado se muestra como error recuperable (elegir otro horario), sin reportarse al crash reporter.
- [ ] El mensaje de éxito refleja el estado real que devuelve el back (no un texto fijo asumiendo un solo estado posible).
- [ ] Se borran los mocks de horarios y de creación de Turno en `mock-business.ts`/`types.ts` que este ticket reemplaza; los tres campos marcados `ponytail` en `types.ts` (`depositPercent`, `notes`, fotos) quedan resueltos entre este ticket y los tickets 05/06.
- [ ] Tests unitarios por capa: adaptador de slots (200 parseado con `reason`, 400/404/422 mapeados); adaptador de creación de Turno (201, 409, otros mapeados); caso de uso de reserva (arma el body correcto, incluye `notes` solo si se escribió algo); controlador (propaga el 409 como error no reportable).

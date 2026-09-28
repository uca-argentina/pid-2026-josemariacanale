# 03: Seña y Comentario del Turno

**Spec:** `../../../../.scratch/reserva-real-por-sucursal/spec.md`
**ADR relevante:** actualizar `../../../../docs/adr/0007-endpoints-de-la-api.md`

**Dónde trabajar:** `agendic-back/`. Glosario y ADRs en la raíz (`../CONTEXT.md`, `../docs/adr/`).

**What to build:** dos campos de dominio nuevos que hoy el front solo mockeaba: la Seña de un Servicio y el Comentario del Turno que deja el Cliente al Reservar.

La Seña es **simbólica**: es un número que se guarda y se muestra, no dispara ningún cobro ni integración de pagos. No hay nada de procesamiento de pagos en este ticket.

**Blocked by:** Ninguno (puede arrancar ya).

- [ ] `Service` gana `depositPercent`, opcional, entero entre 0 y 100. `NULL`/ausente significa que ese Servicio no pide Seña.
- [ ] Crear y actualizar Servicio aceptan `depositPercent`; fuera de 0-100 → 400. La respuesta de Servicio lo incluye.
- [ ] `Booking` gana `notes`, texto libre opcional (largo razonable, por ejemplo hasta 500 caracteres; más largo → 400). Sin validación de contenido más allá del largo.
- [ ] Crear Turno (`POST /bookings`) acepta `notes`; la respuesta de Turno (para el Cliente y para el Dueño) lo incluye.
- [ ] Se revisa si `POST /bookings` ya devuelve 409 ante un choque de horario concurrente (dos reservas para el mismo horario casi al mismo tiempo). Si el back ya lo maneja pero no está en `docs/adr/0007-endpoints-de-la-api.md`, se documenta ahí. Si no lo maneja, se agrega (dos `POST /bookings` para el mismo horario: el primero gana, el segundo 409).
- [ ] `docs/adr/0007-endpoints-de-la-api.md` queda actualizado con `depositPercent` en Servicio, `notes` en Turno, y el 409 de horario ocupado si correspondía documentarlo o agregarlo.
- [ ] Tests HTTP: Servicio con `depositPercent` fuera de rango → 400; sin `depositPercent` → sigue creando igual que antes; Turno con `notes` → se guarda y viene en la respuesta; sin `notes` → sigue funcionando igual que hoy; dos reservas concurrentes al mismo horario → la segunda 409.

**Nota:** el back está evolucionando en paralelo el flujo de Aceptar/Rechazar Turno pendiente (Aprobación manual, `BookingStatus.PENDING/REJECTED`) — esto es ortogonal a este ticket. `notes` y `depositPercent` no interactúan con ese estado; se guardan y devuelven igual sin importar en qué estado nazca el Turno.

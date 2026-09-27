import { BookingStatus, Prisma } from '../../generated/prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;

/** en-CA formats as YYYY-MM-DD, so this needs no manual reassembly of the parts. */
const localDate = (instant: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(instant);

/**
 * Reassigns an Empleado's BOOKED Turnos of one date to a cubridor, inside a caller-owned transaction so
 * it commits atomically with the Anulación that activates the Cobertura (ADR 0004: a colliding Turno of
 * the cubridor rolls both back). Same shape as cancelFutureBooked, for the same reason it lives here
 * instead of behind a domain port: it must share the caller's transaction, which a port can't be typed
 * against without leaking Prisma into the domain.
 *
 * "That date" is each Turno's own Servicio's Sucursal's local date (the only source of time zone, per
 * ADR): an Empleado can attend Servicios of Sucursales in different zones, so there's no one zone to
 * assume. The query's ±1 day UTC margin around it is wider than any real IANA offset, just to avoid
 * scanning every Turno ever booked; the exact local date is then checked in JS.
 */
export async function reassignBookedOnDate(
  tx: Prisma.TransactionClient,
  employeeId: number,
  coveredByEmployeeId: number,
  date: string,
) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const candidates = await tx.booking.findMany({
    where: {
      employeeId,
      status: { in: [BookingStatus.BOOKED, BookingStatus.CONFIRMADO] },
      startsAt: {
        gte: new Date(start.getTime() - DAY_MS),
        lt: new Date(start.getTime() + 2 * DAY_MS),
      },
    },
    select: {
      id: true,
      startsAt: true,
      service: { select: { branch: { select: { timeZone: true } } } },
    },
  });
  const ids = candidates
    .filter(
      (booking) =>
        localDate(booking.startsAt, booking.service.branch.timeZone) === date,
    )
    .map((booking) => booking.id);
  if (ids.length)
    await tx.booking.updateMany({
      where: { id: { in: ids } },
      data: { employeeId: coveredByEmployeeId },
    });
}

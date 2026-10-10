import { CancelledBooking } from '../../domain/bookings/booking';
import { Prisma } from '../../generated/prisma/client';

/**
 * Cancels future PENDING and BOOKED Turnos of a Servicio (optionally one Empleado's), with `userId`, of every
 * Turno a Usuario attends across all their Servicios, or with `businessId`, of every Servicio of a Negocio,
 * inside a caller-owned transaction so the cascade and its cancellations commit together. business-model-v2.md's Ports section
 * assigns this capability to the bookings repository, but it must share the caller's transaction to be
 * atomic with the Servicio/Empleado mutation, which a domain port can't be typed against without leaking
 * Prisma into the domain — so it lives here, called directly by the Services/Employees Prisma adapters.
 * Returns who to send the Aviso de cambio del Turno to, read in the same transaction as the update.
 */
export async function cancelFutureBooked(
  tx: Prisma.TransactionClient,
  where: {
    serviceId?: number;
    employeeId?: number;
    userId?: number;
    businessId?: number;
  },
  now: Date,
): Promise<CancelledBooking[]> {
  const { businessId, ...rest } = where;
  const rows = await tx.booking.findMany({
    where: {
      ...rest,
      ...(businessId !== undefined && { service: { branch: { businessId } } }),
      status: { in: ['PENDING', 'BOOKED'] }, startsAt: { gt: now },
    },
    select: { id: true, link: true, client: { select: { email: true } } },
  });
  await tx.booking.updateMany({
    where: { id: { in: rows.map(({ id }) => id) } },
    data: { status: 'CANCELLED' },
  });
  // Every Turno has its Cliente (ADR 0005), so the filter only narrows the type.
  return rows.flatMap(({ link, client }) => (client ? [{ clientEmail: client.email, link }] : []));
}

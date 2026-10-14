import { CausedCancellationOrder } from '../../domain/bookings/booking';
import { Prisma } from '../../generated/prisma/client';

/**
 * Cancela, dentro de una transacción del llamador, los Turnos que un cambio en el horario de quien los atiende deja
 * afuera (ADR 0034), para que la cancelación se confirme junto con el cambio.
 *
 * Solo toca los que siguen pendientes o aceptados y todavía no empezaron en `now`: uno que otro request ya canceló o que
 * ya arrancó se deja como está. Les pone `cancelledBy` EMPLOYEE, `cancelledAt` = `now`, el Motivo de cancelación y la
 * Causa. Agrupa los Turnos por Causa y texto para hacer pocas escrituras. Devuelve los ids que de verdad canceló.
 */
export async function cancelCaused(
  tx: Prisma.TransactionClient,
  orders: CausedCancellationOrder[],
  now: Date,
): Promise<number[]> {
  if (orders.length === 0) return [];
  const open = await tx.booking.findMany({
    where: {
      id: { in: orders.map(({ id }) => id) },
      status: { in: ['PENDING', 'BOOKED'] },
      startsAt: { gt: now },
    },
    select: { id: true },
  });
  const stillOpen = new Set(open.map(({ id }) => id));

  const groups = new Map<string, { order: CausedCancellationOrder; ids: number[] }>();
  for (const order of orders) {
    if (!stillOpen.has(order.id)) continue;
    const key = `${order.cause}\n${order.reason}`;
    const group = groups.get(key) ?? { order, ids: [] };
    group.ids.push(order.id);
    groups.set(key, group);
  }
  for (const { order, ids } of groups.values())
    await tx.booking.updateMany({
      // The same filter as above: a Turno cancelled or started in between is not overwritten.
      where: { id: { in: ids }, status: { in: ['PENDING', 'BOOKED'] }, startsAt: { gt: now } },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancelledBy: 'EMPLOYEE',
        cancellationReason: order.reason,
        cancellationCause: order.cause,
      },
    });
  return [...groups.values()].flatMap(({ ids }) => ids);
}

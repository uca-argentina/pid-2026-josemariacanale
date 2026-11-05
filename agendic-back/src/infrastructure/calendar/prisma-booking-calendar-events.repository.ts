import { Injectable } from '@nestjs/common';
import {
  BookingCalendarEventsRepository,
  LiveBookingWithEvent,
  StoredBookingEvent,
} from '../../domain/calendar/booking-calendar-events.repository';
import { BookingStatus } from '../../domain/bookings/booking';
import { DatabaseOperationError } from '../../domain/errors';
import { PrismaService } from '../prisma.service';

const eventSelect = {
  bookingId: true,
  userId: true,
  googleEventId: true,
  fingerprint: true,
} as const;

/** Acceso a los Eventos del Turno escritos (`BookingCalendarEvent`, ADR 0038, #401). */
@Injectable()
export class PrismaBookingCalendarEventsRepository
  implements BookingCalendarEventsRepository
{
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista los Turnos vivos de Usuarios conectados con su evento.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  async listLiveOfConnectedUsers(now: Date): Promise<LiveBookingWithEvent[]> {
    const rows = await this.prisma.booking
      .findMany({
        where: {
          status: { in: ['PENDING', 'BOOKED'] },
          endsAt: { gt: now },
          client: { isNot: null },
          user: { calendar: { status: 'CONNECTED' } },
        },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          userId: true,
          status: true,
          startsAt: true,
          endsAt: true,
          notes: true,
          fromRescheduleId: true,
          client: { select: { name: true, email: true } },
          service: {
            select: {
              name: true,
              branch: {
                select: {
                  name: true,
                  address: true,
                  business: { select: { name: true } },
                },
              },
            },
          },
          calendarEvent: { select: eventSelect },
        },
      })
      .catch(translateError);
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      status: row.status as BookingStatus.PENDING | BookingStatus.BOOKED,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      notes: row.notes,
      fromRescheduleId: row.fromRescheduleId,
      clientName: row.client!.name,
      clientEmail: row.client!.email,
      serviceName: row.service.name,
      businessName: row.service.branch?.business.name ?? null,
      branchName: row.service.branch?.name ?? null,
      branchAddress: row.service.branch?.address ?? null,
      event: row.calendarEvent,
    }));
  }

  /**
   * Lista los eventos de Turnos Cancelados o Rechazados.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  async listOfEndedBookingsOfConnectedUsers(): Promise<StoredBookingEvent[]> {
    return this.prisma.bookingCalendarEvent
      .findMany({
        where: {
          booking: { status: { in: ['CANCELLED', 'REJECTED'] } },
          user: { calendar: { status: 'CONNECTED' } },
        },
        orderBy: { bookingId: 'asc' },
        select: eventSelect,
      })
      .catch(translateError);
  }

  /**
   * Busca el evento en la cadena de Reagendamientos anteriores.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  async findEventOfPreviousBooking(bookingId: number) {
    try {
      const seen = new Set<number>([bookingId]);
      let current = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { fromRescheduleId: true },
      });
      while (current?.fromRescheduleId != null) {
        const previousId = current.fromRescheduleId;
        if (seen.has(previousId)) return null;
        seen.add(previousId);
        const previous = await this.prisma.booking.findUnique({
          where: { id: previousId },
          select: {
            fromRescheduleId: true,
            calendarEvent: { select: eventSelect },
          },
        });
        if (previous?.calendarEvent) return previous.calendarEvent;
        current = previous;
      }
      return null;
    } catch (error) {
      return translateError(error);
    }
  }

  /**
   * Guarda o reemplaza el evento del Turno.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  async save(event: StoredBookingEvent, now: Date) {
    const data = {
      userId: event.userId,
      googleEventId: event.googleEventId,
      fingerprint: event.fingerprint,
      syncedAt: now,
    };
    await this.prisma.bookingCalendarEvent
      .upsert({
        where: { bookingId: event.bookingId },
        create: { bookingId: event.bookingId, ...data },
        update: data,
      })
      .catch(translateError);
  }

  /**
   * Pasa el evento al Turno que reemplazó al original.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  async moveToBooking(fromBookingId: number, toBookingId: number) {
    await this.prisma.bookingCalendarEvent
      .update({
        where: { bookingId: fromBookingId },
        data: { bookingId: toBookingId },
      })
      .catch(translateError);
  }

  /**
   * Olvida el evento del Turno.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  async deleteByBookingId(bookingId: number) {
    await this.prisma.bookingCalendarEvent
      .deleteMany({ where: { bookingId } })
      .catch(translateError);
  }

  /**
   * Lista los eventos de Turnos que no terminaron.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  async listFutureByUserId(userId: number, now: Date) {
    return this.prisma.bookingCalendarEvent
      .findMany({
        where: { userId, booking: { endsAt: { gt: now } } },
        orderBy: { bookingId: 'asc' },
        select: eventSelect,
      })
      .catch(translateError);
  }

  /**
   * Olvida todos los eventos del Usuario.
   *
   * @throws {DatabaseOperationError} la base falló
   */
  async deleteByUserId(userId: number) {
    await this.prisma.bookingCalendarEvent
      .deleteMany({ where: { userId } })
      .catch(translateError);
  }
}

const translateError = (error: unknown): never => {
  throw new DatabaseOperationError('Booking calendar event query failed', {
    cause: error,
  });
};

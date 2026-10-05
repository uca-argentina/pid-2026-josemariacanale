import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import { Booking, bookingVerificationExpiresAt, CreateBookingInput } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { ConflictError } from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';
import {
  assertBookable,
  assertSlotAvailable,
  assertUnderDailyLimit,
} from './assert-booking-rules';

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly listSlots: ListSlotsUseCase,
  ) {}

  /**
   * Reserva un Turno sin verificar. Ocupa la agenda del Empleado desde la preparación del Servicio, que queda fijada acá.
   *
   * @throws {BusinessRuleError} el Servicio no existe o está dado de baja, el Empleado no lo atiende, el horario ya pasó o no es un Horario reservable
   * @throws {ConflictError} el horario, con su preparación, pisa otro Turno del Empleado, o el Servicio ya alcanzó su Límite diario ese día
   */
  async execute(input: CreateBookingInput): Promise<Booking> {
    const now = this.clock.now();
    const { service, branch } = await assertBookable(
      this.services,
      this.branches,
      input.serviceId,
      input.employeeId,
      input.startsAt,
      now,
    );
    const endsAt = new Date(
      input.startsAt.getTime() + service.durationMinutes * 60_000,
    );
    const prepStartsAt = new Date(
      input.startsAt.getTime() - service.prepMinutes * 60_000,
    );
    if (
      await this.bookings.hasOverlappingOccupied(
        input.employeeId,
        prepStartsAt,
        endsAt,
      )
    )
      throw new ConflictError('Overlaps a booked Turno for this Employee');
    await assertUnderDailyLimit(this.bookings, service, branch, input.startsAt);
    await assertSlotAvailable(
      this.listSlots,
      input.serviceId,
      input.employeeId,
      input.startsAt,
    );

    const { booking, token } = await this.bookings.create(
      {
        serviceId: input.serviceId,
        employeeId: input.employeeId,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        prepStartsAt,
        startsAt: input.startsAt,
        endsAt,
        notes: input.notes || null, // a blank Comentario del Turno is no Comentario
      },
      bookingVerificationExpiresAt(now),
    );
    await this.mailer.sendVerificationLink(booking.clientEmail, token);
    return booking;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { Booking, bookingVerificationExpiresAt, CreateBookingInput } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { NotFoundError } from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';
import { assertBookable, assertUnderDailyLimit } from './assert-booking-rules';
import { pickEmployee } from './pick-employee';

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly listSlots: ListSlotsUseCase,
  ) {}

  /**
   * Reserva un Turno sin verificar y le asigna el Empleado que hace más tiempo que no recibe uno del Servicio (ver `pickEmployee`), o al Usuario dueño de un Servicio personal. Ocupa la agenda de quien lo atiende desde la preparación del Servicio, que queda fijada acá.
   *
   * @throws {BusinessRuleError} el Servicio no existe o está dado de baja, el horario ya pasó o no es un Horario reservable de ningún Empleado
   * @throws {ConflictError} el Servicio ya alcanzó su Límite diario ese día
   */
  async execute(
    input: CreateBookingInput,
  ): Promise<Booking & { employeeName: string }> {
    const now = this.clock.now();
    const { service, timeZone } = await assertBookable(
      this.services,
      this.branches,
      this.availabilities,
      input.serviceId,
      undefined,
      input.startsAt,
      now,
    );
    const endsAt = new Date(
      input.startsAt.getTime() + service.durationMinutes * 60_000,
    );
    const prepStartsAt = new Date(
      input.startsAt.getTime() - service.prepMinutes * 60_000,
    );
    await assertUnderDailyLimit(this.bookings, service, timeZone, input.startsAt);
    const attendant = await pickEmployee(
      this.listSlots,
      this.bookings,
      input.serviceId,
      input.startsAt,
    );

    const { booking, token } = await this.bookings.create(
      {
        serviceId: input.serviceId,
        employeeId: attendant.employeeId,
        userId: attendant.userId,
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
    // The name is the Empleado's, or the Usuario's own in a Servicio personal; both come from the Usuario.
    const employee = service.employees.find(({ id }) => id === attendant.employeeId);
    const attendingUser = employee ? null : await this.users.findById(attendant.userId);
    if (!employee && !attendingUser)
      throw new NotFoundError(`User ${attendant.userId} not found`);
    return { ...booking, employeeName: (employee ?? attendingUser!).name };
  }
}

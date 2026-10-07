import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  BOOKING_VERIFICATION_CODES,
  BookingVerificationCodes,
} from '../../domain/bookings/booking-verification-codes';
import {
  CLIENT_ACCESS_TOKENS,
  ClientAccessTokens,
} from '../../domain/bookings/client-access-tokens';
import { Booking, BookingStatus, CreateBookingInput } from '../../domain/bookings/booking';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
  DailyLimitGuard,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { InvalidCodeError, NotFoundError } from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import { localDayBounds } from '../../domain/slots/slot';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';
import { assertBookable } from './assert-booking-rules';
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
    @Inject(BOOKING_VERIFICATION_CODES)
    private readonly codes: BookingVerificationCodes,
    @Inject(CLIENT_ACCESS_TOKENS)
    private readonly accessTokens: ClientAccessTokens,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
    private readonly listSlots: ListSlotsUseCase,
  ) {}

  /**
   * Reserva un Turno, ya BOOKED o PENDING con Aprobación manual, y le asigna el Empleado que hace más tiempo que no
   * recibe uno del Servicio (ver `pickEmployee`), o al Usuario dueño de un Servicio personal. Ocupa la agenda de
   * quien lo atiende desde la preparación del Servicio, que queda fijada acá. Exige un Código de verificación vigente
   * para `clientEmail` (ADR 0022), que al validarse también da acceso a Mis turnos. Manda la Confirmación de
   * reserva con el Enlace del Turno.
   *
   * @throws {InvalidCodeError} el código no es válido para clientEmail en su ventana
   * @throws {BusinessRuleError} el Servicio no existe o está dado de baja, el horario ya pasó o no es un Horario reservable de ningún Empleado
   * @throws {ConflictError} el horario ya lo ocupa otro Turno del Empleado, o el Servicio ya alcanzó su Límite diario ese día
   */
  async execute(
    input: CreateBookingInput,
  ): Promise<Booking & { employeeName: string; access: string; accessExpiresAt: Date }> {
    const now = this.clock.now();
    if (!this.codes.verify(input.clientEmail, input.code))
      throw new InvalidCodeError(
        `Invalid or expired verification code for ${input.clientEmail}`,
      );
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
    const attendant = await pickEmployee(
      this.listSlots,
      this.bookings,
      input.serviceId,
      input.startsAt,
    );
    const status = service.requiresApproval
      ? BookingStatus.PENDING
      : BookingStatus.BOOKED;
    let dailyLimit: DailyLimitGuard | undefined;
    if (service.dailyLimit !== null) {
      const { from, to } = localDayBounds(input.startsAt, timeZone);
      dailyLimit = { serviceId: service.id, limit: service.dailyLimit, from, to };
    }

    const booking = await this.bookings.create(
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
        status,
      },
      dailyLimit,
    );
    // The name is the Empleado's, or the Usuario's own in a Servicio personal; both come from the Usuario.
    const employee = service.employees.find(({ id }) => id === attendant.employeeId);
    const attendingUser = employee ? null : await this.users.findById(attendant.userId);
    if (!employee && !attendingUser)
      throw new NotFoundError(`User ${attendant.userId} not found`);
    const { access, expiresAt } = this.accessTokens.sign(input.clientEmail);
    await this.mailer.sendBookingConfirmation(input.clientEmail, booking.link);
    return {
      ...booking,
      employeeName: (employee ?? attendingUser!).name,
      access,
      accessExpiresAt: expiresAt,
    };
  }
}

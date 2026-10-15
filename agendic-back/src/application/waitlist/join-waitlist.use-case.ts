import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  BOOKING_VERIFICATION_CODES,
  BookingVerificationCodes,
} from '../../domain/bookings/booking-verification-codes';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  BusinessRuleError,
  ConflictError,
  InvalidCodeError,
  NotFoundError,
} from '../../domain/errors';
import { MAILER, Mailer } from '../../domain/mailer';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { localDate } from '../../domain/slots/slot';
import { WaitlistEntry } from '../../domain/waitlist/waitlist-entry';
import {
  WAITLIST_REPOSITORY,
  WaitlistRepository,
} from '../../domain/waitlist/waitlist.repository';
import { serviceTimeZone } from '../services/service-time-zone';
import { ListSlotsUseCase } from '../slots/list-slots.use-case';

const logger = new Logger('JoinWaitlist');

export interface JoinWaitlistInput {
  serviceId: number;
  /** `YYYY-MM-DD`, en la zona horaria del Servicio. */
  date: string;
  clientName: string;
  clientEmail: string;
  code: string;
}

/** Anotarse en la Lista de espera de un Servicio para un día lleno. */
@Injectable()
export class JoinWaitlistUseCase {
  constructor(
    @Inject(SERVICES_REPOSITORY) private readonly services: ServicesRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(WAITLIST_REPOSITORY) private readonly waitlist: WaitlistRepository,
    @Inject(BOOKING_VERIFICATION_CODES)
    private readonly codes: BookingVerificationCodes,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
    private readonly listSlots: ListSlotsUseCase,
  ) {}

  /**
   * Anota al Cliente, sin retener ningún horario, y le manda la Confirmación de anotación; si el mail falla se loguea
   * y la Anotación queda creada. Repetir la Anotación viva de ese email, Servicio y fecha no crea otra ni manda mail
   * (`created: false`); una que ya Salió no cuenta. Exige un Código de verificación vigente para `clientEmail`
   * (ADR 0022).
   *
   * @throws {InvalidCodeError} el código no es válido para clientEmail
   * @throws {NotFoundError} el Servicio no existe o está dado de baja
   * @throws {BusinessRuleError} la fecha es anterior a hoy en la zona del Servicio
   * @throws {ConflictError} ese día el Servicio no está lleno: tiene Horarios reservables, o nadie trabaja o está Fuera de la oficina
   */
  async execute(
    input: JoinWaitlistInput,
  ): Promise<{ serviceId: number; date: string; created: boolean }> {
    if (!this.codes.verify(input.clientEmail, input.code))
      throw new InvalidCodeError(
        `Invalid or expired verification code for ${input.clientEmail}`,
      );
    const service = await this.services.findById(input.serviceId);
    if (!service || service.deletedAt)
      throw new NotFoundError('Service not found or retired');
    const timeZone = await serviceTimeZone(
      this.branches,
      this.availabilities,
      service,
    );
    if (input.date < localDate(this.clock.now(), timeZone))
      throw new BusinessRuleError(`Date ${input.date} is in the past`);

    // Without employeeId: a day is full only when every Empleado of the Servicio is.
    const { days } = await this.listSlots.execute(
      input.serviceId,
      input.date,
      input.date,
    );
    if (days[0]?.reason !== 'FULLY_BOOKED')
      throw new ConflictError(
        `Date ${input.date} is not fully booked for Service ${input.serviceId}`,
      );

    const alive = await this.waitlist.findAlive(
      input.serviceId,
      input.date,
      input.clientEmail,
    );
    const result = { serviceId: input.serviceId, date: input.date };
    if (alive) return { ...result, created: false };
    let entry: WaitlistEntry;
    try {
      entry = await this.waitlist.create({
        ...result,
        clientName: input.clientName,
        email: input.clientEmail,
      });
    } catch (error) {
      // Lost a race against the same Anotación: it exists now, which is the idempotent answer.
      if (error instanceof ConflictError) return { ...result, created: false };
      throw error;
    }
    await this.mailer
      .sendWaitlistConfirmation(
        entry.email,
        entry.clientName,
        service.name,
        entry.date,
        entry.link,
      )
      .catch((error) =>
        logger.error(
          `Confirmación de anotación ${entry.id} to ${entry.email} failed`,
          error instanceof Error ? error.stack : String(error),
        ),
      );
    return { ...result, created: true };
  }
}

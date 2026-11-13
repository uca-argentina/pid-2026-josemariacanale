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
  date: string;
  clientName: string;
  clientEmail: string;
  code: string;
}

// Anotarse en la Lista de espera de un Servicio para un dia lleno. 

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

  async execute(
    input: JoinWaitlistInput,
  ): Promise<{ serviceId: number; date: string; created: boolean }> {
    if (!this.codes.verify(input.clientEmail, input.code))
      throw new InvalidCodeError(
        `Codigo invalido o expirado ${input.clientEmail}`,
      );
    const service = await this.services.findById(input.serviceId);
    if (!service || service.deletedAt)
      throw new NotFoundError('Servicio no encontrado');
    const timeZone = await serviceTimeZone(
      this.branches,
      this.availabilities,
      service,
    );
    if (input.date < localDate(this.clock.now(), timeZone))
      throw new BusinessRuleError(`El dia ${input.date} ya paso`);

    const { days } = await this.listSlots.execute(
      input.serviceId,
      input.date,
      input.date,
    );
    if (days[0]?.reason !== 'FULLY_BOOKED')
      throw new ConflictError(
        `El dia ${input.date} no esta del todo lleno para el servicio ${input.serviceId}`,
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
          `Confirmación de anotación ${entry.id} para ${entry.email} falló`,
          error instanceof Error ? error.stack : String(error),
        ),
      );
    return { ...result, created: true };
  }
}

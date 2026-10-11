import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { OutOfOffice } from '../../domain/out-of-office/out-of-office';
import {
  OUT_OF_OFFICE_REPOSITORY,
  OutOfOfficeRepository,
} from '../../domain/out-of-office/out-of-office.repository';
import { localDate } from '../../domain/slots/slot';
import { defaultAvailability } from '../availabilities/default-availability';

@Injectable()
export class ListOutOfOfficeUseCase {
  constructor(
    @Inject(OUT_OF_OFFICE_REPOSITORY)
    private readonly outOfOffice: OutOfOfficeRepository,
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Los períodos del Usuario que todavía no terminaron, por inicio ascendente. "Hoy" se lee en la zona de su
   * Availability predeterminada.
   *
   * @throws {BusinessRuleError} el Usuario no tiene Availability predeterminada
   */
  async execute(userId: number): Promise<OutOfOffice[]> {
    const { timeZone } = await defaultAvailability(this.availabilities, userId);
    return this.outOfOffice.listByUserEndingFrom(
      userId,
      localDate(this.clock.now(), timeZone),
    );
  }
}

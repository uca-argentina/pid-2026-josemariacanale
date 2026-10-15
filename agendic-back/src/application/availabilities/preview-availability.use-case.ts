import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABILITIES_REPOSITORY,
  AvailabilitiesRepository,
} from '../../domain/availabilities/availabilities.repository';
import {
  AvailabilityFields,
  assertValidAvailability,
} from '../../domain/availabilities/availability';
import {
  LeftOutsideBooking,
  LeftOutsideBookingsService,
} from '../bookings/left-outside-bookings.service';
import { getOwnAvailability } from './get-own-availability';

/** Vista previa de los Turnos que guardar una Availability deja afuera (ADR 0034). */
@Injectable()
export class PreviewAvailabilityUseCase {
  constructor(
    @Inject(AVAILABILITIES_REPOSITORY)
    private readonly availabilities: AvailabilitiesRepository,
    private readonly leftOutside: LeftOutsideBookingsService,
  ) {}

  /**
   * Los Turnos que la Availability guardada como `input` dejaría afuera, sin guardar nada. Falla igual que guardarla y en
   * el mismo orden, antes de calcular.
   *
   * @throws {NotFoundError} no existe o no es del Usuario
   * @throws {BusinessRuleError} la zona no es IANA, o un rango termina antes de empezar o se pisa con otro
   */
  async execute(
    userId: number,
    id: number,
    input: AvailabilityFields,
  ): Promise<LeftOutsideBooking[]> {
    const current = await getOwnAvailability(this.availabilities, id, userId);
    assertValidAvailability(input);
    return this.leftOutside.forAvailability(userId, current, input);
  }
}

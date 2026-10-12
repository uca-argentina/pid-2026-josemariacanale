import { Inject, Injectable } from '@nestjs/common';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import {
  CABINS_REPOSITORY,
  CabinsRepository,
} from '../../domain/cabins/cabins.repository';
import {
  BOOKINGS_REPOSITORY,
  BookingsRepository,
} from '../../domain/bookings/bookings.repository';
import { CLOCK, Clock } from '../../domain/clock';
import { ConflictError } from '../../domain/errors';
import { assertBranchOwner } from '../branches/assert-branch-owner';
import { findActiveCabin } from './find-active-cabin';

/** Da de baja una Cabina; la fila queda como historial. */
@Injectable()
export class RetireCabinUseCase {
  constructor(
    @Inject(CABINS_REPOSITORY) private readonly cabins: CabinsRepository,
    @Inject(BRANCHES_REPOSITORY) private readonly branches: BranchesRepository,
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @throws {NotFoundError} the Cabina doesn't exist or was already dada de baja
   * @throws {ForbiddenError} the Usuario isn't the Dueño of its Negocio
   * @throws {ConflictError} the Cabina still has PENDING or BOOKED Turnos that haven't ended: Reagendarlos or Cancelarlos first (ADR 0030)
   */
  async execute(userId: number, id: number): Promise<void> {
    const cabin = await findActiveCabin(this.cabins, id);
    await assertBranchOwner(
      this.branches,
      this.businesses,
      cabin.branchId,
      userId,
    );
    const upcoming = await this.bookings.countUpcomingByCabin(
      id,
      this.clock.now(),
    );
    if (upcoming > 0)
      throw new ConflictError(`Cabin ${id} has ${upcoming} upcoming Turnos`);
    await this.cabins.retire(id);
  }
}

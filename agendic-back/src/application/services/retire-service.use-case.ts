import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import {
  BRANCHES_REPOSITORY,
  BranchesRepository,
} from '../../domain/branches/branches.repository';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { NotFoundError } from '../../domain/errors';
import {
  SERVICES_REPOSITORY,
  ServicesRepository,
} from '../../domain/services/services.repository';
import { MAILER, Mailer } from '../../domain/mailer';
import { notifyClients } from '../bookings/notify-clients';
import { assertServiceOwner } from './assert-service-owner';

/** Da de baja un Servicio y cancela sus Turnos futuros, avisando por mail al Cliente de cada uno. */
@Injectable()
export class RetireServiceUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(BRANCHES_REPOSITORY)
    private readonly branches: BranchesRepository,
    @Inject(SERVICES_REPOSITORY)
    private readonly services: ServicesRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async execute(
    userId: number,
    serviceId: number,
  ): Promise<{ id: number; cancelledBookings: number }> {
    const service = await this.services.findById(serviceId);
    if (!service) throw new NotFoundError('Service not found');
    await assertServiceOwner(this.branches, this.businesses, service, userId);
    const { cancelledBookings } = await this.services.retire(
      serviceId,
      this.clock.now(),
    );
    await notifyClients(cancelledBookings, (email, link) =>
      this.mailer.sendBookingCancellation(email, link),
    );
    return { id: serviceId, cancelledBookings: cancelledBookings.length };
  }
}

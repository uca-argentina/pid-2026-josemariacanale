import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SendRatingRequestsUseCase } from '../../application/bookings/send-rating-requests.use-case';

/** Cada 15 minutos manda las invitaciones a Calificar que ya corresponden. */
@Injectable()
export class RatingRequestsJob {
  constructor(private readonly sendRatingRequests: SendRatingRequestsUseCase) {}

  @Cron('*/15 * * * *')
  run() {
    return this.sendRatingRequests.execute();
  }
}

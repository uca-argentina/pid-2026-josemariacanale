import { Injectable } from '@nestjs/common';
import { DatabaseOperationError } from '../../domain/errors';
import { CausedCancellationOrder } from '../../domain/bookings/booking';
import { UserHolidaySettings } from '../../domain/holidays/user-holiday-settings';
import { UserHolidaySettingsRepository } from '../../domain/holidays/user-holiday-settings.repository';
import { cancelCaused } from '../bookings/cancel-caused';
import { PrismaService } from '../prisma.service';

/** Acceso a los Días festivos elegidos por el Usuario (`UserHolidaySettings`). */
@Injectable()
export class PrismaUserHolidaySettingsRepository implements UserHolidaySettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @throws {DatabaseOperationError} la base falló */
  async findByUserId(userId: number) {
    return this.prisma.userHolidaySettings
      .findUnique({
        where: { userId },
        select: { countryCode: true, disabledIds: true },
      })
      .catch(translateError);
  }

  /** @throws {DatabaseOperationError} la base falló */
  async save(userId: number, settings: UserHolidaySettings) {
    await this.prisma.userHolidaySettings
      .upsert({
        where: { userId },
        create: { userId, ...settings },
        update: settings,
      })
      .catch(translateError);
  }

  /** @throws {DatabaseOperationError} la base falló */
  async saveCancelling(
    userId: number,
    settings: UserHolidaySettings,
    cancellations: CausedCancellationOrder[],
    now: Date,
  ) {
    return this.prisma
      .$transaction(async (tx) => {
        await tx.userHolidaySettings.upsert({
          where: { userId },
          create: { userId, ...settings },
          update: settings,
        });
        return cancelCaused(tx, cancellations, now);
      })
      .catch(translateError);
  }
}

const translateError = (error: unknown): never => {
  throw new DatabaseOperationError('User holiday settings query failed', {
    cause: error,
  });
};

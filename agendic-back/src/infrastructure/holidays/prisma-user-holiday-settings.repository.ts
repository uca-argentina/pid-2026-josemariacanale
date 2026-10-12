import { Injectable } from '@nestjs/common';
import { DatabaseOperationError } from '../../domain/errors';
import { UserHolidaySettings } from '../../domain/holidays/user-holiday-settings';
import { UserHolidaySettingsRepository } from '../../domain/holidays/user-holiday-settings.repository';
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
}

const translateError = (error: unknown): never => {
  throw new DatabaseOperationError('User holiday settings query failed', {
    cause: error,
  });
};

import { Injectable } from '@nestjs/common';
import { Holiday } from '../../domain/holidays/holiday';
import { HolidaysRepository } from '../../domain/holidays/holidays.repository';
import { PrismaService } from '../prisma.service';

/** Acceso a la caché de Días festivos (`HolidayCache`). */
@Injectable()
export class PrismaHolidaysRepository implements HolidaysRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** La fecha de guardado más reciente de ese país y año, o `null`. */
  async findLatestUpdatedAt(countryCode: string, year: number) {
    const row = await this.prisma.holidayCache.findFirst({
      where: { countryCode, year },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    return row?.updatedAt ?? null;
  }

  /** Los Días festivos cacheados de ese país y año, por fecha. */
  async listByCountryCodeAndYear(countryCode: string, year: number) {
    return this.prisma.holidayCache.findMany({
      where: { countryCode, year },
      orderBy: { date: 'asc' },
      select: {
        countryCode: true,
        calendarId: true,
        eventId: true,
        name: true,
        date: true,
        year: true,
      },
    });
  }

  /** Borra y vuelve a cargar ese país y año en una sola transacción. */
  async replaceByCountryCodeAndYear(
    countryCode: string,
    year: number,
    holidays: Holiday[],
  ) {
    await this.prisma.$transaction([
      this.prisma.holidayCache.deleteMany({ where: { countryCode, year } }),
      this.prisma.holidayCache.createMany({
        data: holidays,
        skipDuplicates: true,
      }),
    ]);
  }
}

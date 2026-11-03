import { Injectable } from '@nestjs/common';
import {
  CalendarConnectionsRepository,
  NewCalendarConnection,
} from '../../domain/calendar/calendar-connections.repository';
import { DatabaseOperationError } from '../../domain/errors';
import { PrismaService } from '../prisma.service';
import { readCalendarOauthConfig } from './calendar-oauth-config';
import { decryptRefreshToken, encryptRefreshToken } from './refresh-token-cipher';

/** Acceso al Calendario conectado (`CalendarConnection`); el refresh token se guarda cifrado (ADR 0036). */
@Injectable()
export class PrismaCalendarConnectionsRepository implements CalendarConnectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @throws {DatabaseOperationError} la base falló */
  async findByUserId(userId: number) {
    return this.prisma.calendarConnection
      .findUnique({
        where: { userId },
        select: {
          provider: true,
          email: true,
          status: true,
          connectedAt: true,
        },
      })
      .catch(translateError);
  }

  /**
   * @throws {DatabaseOperationError} la base falló
   * @throws {NotConfiguredError} falta `CALENDAR_TOKEN_KEY`
   */
  async findRefreshTokenByUserId(userId: number) {
    const row = await this.prisma.calendarConnection
      .findUnique({ where: { userId }, select: { encryptedRefreshToken: true } })
      .catch(translateError);
    if (!row) return null;
    return decryptRefreshToken(
      row.encryptedRefreshToken,
      readCalendarOauthConfig().tokenKey,
    );
  }

  /**
   * @throws {DatabaseOperationError} la base falló
   * @throws {NotConfiguredError} falta `CALENDAR_TOKEN_KEY`
   */
  async save(userId: number, connection: NewCalendarConnection) {
    const { refreshToken, ...rest } = connection;
    const data = {
      ...rest,
      status: 'CONNECTED' as const,
      encryptedRefreshToken: encryptRefreshToken(
        refreshToken,
        readCalendarOauthConfig().tokenKey,
      ),
    };
    await this.prisma.calendarConnection
      .upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      })
      .catch(translateError);
  }

  /** @throws {DatabaseOperationError} la base falló */
  async deleteByUserId(userId: number) {
    await this.prisma.calendarConnection
      .deleteMany({ where: { userId } })
      .catch(translateError);
  }
}

const translateError = (error: unknown): never => {
  throw new DatabaseOperationError('Calendar connection query failed', {
    cause: error,
  });
};

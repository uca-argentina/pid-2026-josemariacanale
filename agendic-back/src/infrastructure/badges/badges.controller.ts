import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { GetMyBadgesUseCase } from '../../application/badges/get-my-badges.use-case';
import { ListUnseenBadgesUseCase } from '../../application/badges/list-unseen-badges.use-case';
import { MarkBadgesSeenUseCase } from '../../application/badges/mark-badges-seen.use-case';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';

/** Insignias del Usuario de la Sesión. */
@Controller('users/me/badges')
@UseGuards(ClerkGuard)
export class BadgesController {
  constructor(
    private readonly getMyBadgesUseCase: GetMyBadgesUseCase,
    private readonly listUnseenBadgesUseCase: ListUnseenBadgesUseCase,
    private readonly markBadgesSeenUseCase: MarkBadgesSeenUseCase,
  ) {}

  /** Una entrada por Insignia del catálogo, con el Nivel ganado y el progreso al próximo. */
  @Get()
  list(@CurrentUser() userId: number) {
    return this.getMyBadgesUseCase.execute(userId);
  }

  /** Los Niveles ganados que el Usuario todavía no vio, del más viejo al más nuevo. */
  @Get('unseen')
  async unseen(@CurrentUser() userId: number) {
    const unseen = await this.listUnseenBadgesUseCase.execute(userId);
    return unseen.map((u) => ({ ...u, earnedAt: u.earnedAt.toISOString() }));
  }

  /** Marca como vistos todos los Niveles sin ver; 204 sin body. */
  @Post('seen')
  @HttpCode(204)
  async seen(@CurrentUser() userId: number) {
    await this.markBadgesSeenUseCase.execute(userId);
  }
}

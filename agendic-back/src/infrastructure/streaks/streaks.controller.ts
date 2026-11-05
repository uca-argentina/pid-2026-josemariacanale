import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateStreakRewardUseCase } from '../../application/streaks/create-streak-reward.use-case';
import { DeleteStreakRewardUseCase } from '../../application/streaks/delete-streak-reward.use-case';
import { GetStreakProgramUseCase } from '../../application/streaks/get-streak-program.use-case';
import { SaveStreakProgramUseCase } from '../../application/streaks/save-streak-program.use-case';
import { UpdateStreakRewardUseCase } from '../../application/streaks/update-streak-reward.use-case';
import { StreakProgramOwner } from '../../domain/streaks/streak-program';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import {
  presentStreakProgram,
  presentStreakReward,
} from './streak-program.presenter';
import {
  CreateStreakRewardDto,
  SaveStreakProgramDto,
  UpdateStreakRewardDto,
} from './streaks.dto';

const ofBusiness = (businessId: number): StreakProgramOwner => ({
  kind: 'business',
  businessId,
});

const personalOf = (userId: number): StreakProgramOwner => ({
  kind: 'personal',
  userId,
});

/** Configuración de las Rachas y sus Recompensas; everything needs a Sesión. */
@Controller()
@UseGuards(ClerkGuard)
export class StreaksController {
  constructor(
    private readonly getStreakProgramUseCase: GetStreakProgramUseCase,
    private readonly saveStreakProgramUseCase: SaveStreakProgramUseCase,
    private readonly createStreakRewardUseCase: CreateStreakRewardUseCase,
    private readonly updateStreakRewardUseCase: UpdateStreakRewardUseCase,
    private readonly deleteStreakRewardUseCase: DeleteStreakRewardUseCase,
  ) {}

  private async getProgram(userId: number, owner: StreakProgramOwner) {
    return presentStreakProgram(
      await this.getStreakProgramUseCase.execute(userId, owner),
    );
  }

  private async saveProgram(
    userId: number,
    owner: StreakProgramOwner,
    dto: SaveStreakProgramDto,
  ) {
    return presentStreakProgram(
      await this.saveStreakProgramUseCase.execute(userId, owner, {
        active: dto.active,
        burnAfterDays: dto.burnAfterDays,
      }),
    );
  }

  private async createReward(
    userId: number,
    owner: StreakProgramOwner,
    dto: CreateStreakRewardDto,
  ) {
    return presentStreakReward(
      await this.createStreakRewardUseCase.execute(userId, owner, {
        requiredCount: dto.requiredCount,
        repeatable: dto.repeatable,
        type: dto.type,
        value: dto.value ?? null,
        description: dto.description ?? null,
        serviceId: dto.serviceId ?? null,
        validForDays: dto.validForDays ?? null,
      }),
    );
  }

  /** @throws {ForbiddenError} the Usuario isn't the Dueño */
  @Get('businesses/:id/streak-program')
  getOfBusiness(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
  ) {
    return this.getProgram(userId, ofBusiness(businessId));
  }

  /** @throws {ForbiddenError} the Usuario isn't the Dueño */
  @Put('businesses/:id/streak-program')
  saveOfBusiness(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
    @Body() dto: SaveStreakProgramDto,
  ) {
    return this.saveProgram(userId, ofBusiness(businessId), dto);
  }

  /**
   * @throws {ForbiddenError} the Usuario isn't the Dueño
   * @throws {BusinessRuleError} the free Servicio isn't of the Negocio or was dado de baja
   */
  @Post('businesses/:id/streak-rewards')
  createOfBusiness(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) businessId: number,
    @Body() dto: CreateStreakRewardDto,
  ) {
    return this.createReward(userId, ofBusiness(businessId), dto);
  }

  @Get('users/me/streak-program')
  getPersonal(@CurrentUser() userId: number) {
    return this.getProgram(userId, personalOf(userId));
  }

  @Put('users/me/streak-program')
  savePersonal(
    @CurrentUser() userId: number,
    @Body() dto: SaveStreakProgramDto,
  ) {
    return this.saveProgram(userId, personalOf(userId), dto);
  }

  /** @throws {BusinessRuleError} the free Servicio isn't a Servicio personal of the Usuario or was dado de baja */
  @Post('users/me/streak-rewards')
  createPersonal(
    @CurrentUser() userId: number,
    @Body() dto: CreateStreakRewardDto,
  ) {
    return this.createReward(userId, personalOf(userId), dto);
  }

  /**
   * @throws {NotFoundError} the Recompensa doesn't exist, was borrada or is somebody else's
   * @throws {ForbiddenError} the Usuario is an Empleado of its Negocio, not the Dueño
   * @throws {BusinessRuleError} the free Servicio isn't of the program's owner or was dado de baja
   */
  @Patch('streak-rewards/:id')
  async updateReward(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStreakRewardDto,
  ) {
    return presentStreakReward(
      await this.updateStreakRewardUseCase.execute(userId, id, { ...dto }),
    );
  }

  /**
   * @throws {NotFoundError} the Recompensa doesn't exist, was borrada or is somebody else's
   * @throws {ForbiddenError} the Usuario is an Empleado of its Negocio, not the Dueño
   */
  @Delete('streak-rewards/:id')
  @HttpCode(204)
  async deleteReward(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.deleteStreakRewardUseCase.execute(userId, id);
  }
}

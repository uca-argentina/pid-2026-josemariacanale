import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { GetMeUseCase } from '../../application/users/get-me.use-case';
import { RetireMeUseCase } from '../../application/users/retire-me.use-case';
import { UpdateMeUseCase } from '../../application/users/update-me.use-case';
import { AllowRetiredUser, ClerkGuard, CurrentUser } from './clerk.guard';
import { presentUser } from './user.presenter';
import { UpdateMeDto } from './users.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly retireMeUseCase: RetireMeUseCase,
  ) {}

  @Get('me')
  @UseGuards(ClerkGuard)
  async getMe(@CurrentUser() userId: number) {
    return presentUser(await this.getMeUseCase.execute(userId));
  }

  @Patch('me')
  @UseGuards(ClerkGuard)
  async updateMe(@CurrentUser() userId: number, @Body() dto: UpdateMeDto) {
    return presentUser(await this.updateMeUseCase.execute(userId, dto));
  }

  /** Da de baja al Usuario de la Sesión (ADR 0023); 204 sin body. */
  @Delete('me')
  @HttpCode(204)
  @UseGuards(ClerkGuard)
  @AllowRetiredUser()
  async retireMe(@CurrentUser() userId: number) {
    await this.retireMeUseCase.execute(userId);
  }
}

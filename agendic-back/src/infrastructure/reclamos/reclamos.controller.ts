import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { CreateReclamoDto, UpdateReclamoDto } from './dto/reclamos.dto';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { ReclamosService } from './reclamos.service';

@Controller('claims')
export class ReclamosController {
  constructor(private readonly reclamosService: ReclamosService) {}

  @Post('/:link')
  create(@Param('link') link: string, @Body() dto: CreateReclamoDto) {
    return this.reclamosService.create(link, dto);
  }

  @Get('/:link')
  find(@Param('link') link: string) {
    return this.reclamosService.find(link);
  }

  @Get()
  @UseGuards(ClerkGuard)
  findAll(@CurrentUser() userId: number) {
    return this.reclamosService.findAll(userId);
  }

  @Put('/:id')
  @UseGuards(ClerkGuard)
  update(
    @CurrentUser() userId: number,
    @Param('id') claimId: number,
    @Body() dto: UpdateReclamoDto,
  ) {
    return this.reclamosService.update(userId, claimId, dto);
  }
}

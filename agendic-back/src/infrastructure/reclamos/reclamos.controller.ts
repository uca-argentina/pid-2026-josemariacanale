import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { CreateReclamoDto } from './dto/reclamos.dto';
import { ClerkGuard } from '../users/clerk.guard';
import { ReclamosService } from './reclamos.service';

@Controller('reclamos')
export class ReclamosController {
  constructor(private readonly reclamosService: ReclamosService) {}

  @Post()
  create(@Body() dto: CreateReclamoDto) {
    return this.reclamosService.create(dto);
  }

  @Get()
  find() {}

  @Get()
  @UseGuards(ClerkGuard)
  findAll() {}

  @Put('/:id')
  update() {}
}

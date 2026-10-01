import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AssignEmployeeUseCase } from '../../application/services/assign-employee.use-case';
import { CreateServiceUseCase } from '../../application/services/create-service.use-case';
import { GetServiceBySlugUseCase } from '../../application/services/get-service-by-slug.use-case';
import { ListActiveServicesByBranchUseCase } from '../../application/services/list-active-services-by-branch.use-case';
import { ListMyServicesUseCase } from '../../application/services/list-my-services.use-case';
import { RemoveEmployeeUseCase } from '../../application/services/remove-employee.use-case';
import { RetireServiceUseCase } from '../../application/services/retire-service.use-case';
import { UpdateServiceUseCase } from '../../application/services/update-service.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { ParseDatePipe } from '../parse-date.pipe';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentCatalogGroup, presentService } from './service.presenter';
import {
  AssignEmployeeDto,
  CreateServiceDto,
  UpdateServiceDto,
} from './services.dto';

@Controller()
export class ServicesController {
  constructor(
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly retireServiceUseCase: RetireServiceUseCase,
    private readonly listActiveServicesByBranchUseCase: ListActiveServicesByBranchUseCase,
    private readonly getServiceBySlugUseCase: GetServiceBySlugUseCase,
    private readonly assignEmployeeUseCase: AssignEmployeeUseCase,
    private readonly removeEmployeeUseCase: RemoveEmployeeUseCase,
    private readonly listSlotsUseCase: ListSlotsUseCase,
    private readonly listMyServicesUseCase: ListMyServicesUseCase,
  ) {}

  /** Catálogo del panel: un grupo por Negocio donde el Usuario es Empleado activo. */
  @Get('employees/me/services')
  @UseGuards(ClerkGuard)
  async listMine(@CurrentUser() userId: number) {
    return (await this.listMyServicesUseCase.execute(userId)).map(
      presentCatalogGroup,
    );
  }

  @Post('branches/:id/services')
  @UseGuards(ClerkGuard)
  async create(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) branchId: number,
    @Body() dto: CreateServiceDto,
  ) {
    return presentService(
      await this.createServiceUseCase.execute(userId, branchId, dto),
    );
  }

  @Patch('services/:id')
  @UseGuards(ClerkGuard)
  async update(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
  ) {
    return presentService(
      await this.updateServiceUseCase.execute(userId, id, dto),
    );
  }

  @Delete('services/:id')
  @UseGuards(ClerkGuard)
  async retire(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.retireServiceUseCase.execute(userId, id);
  }

  @Post('services/:id/employees')
  @UseGuards(ClerkGuard)
  async assignEmployee(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) serviceId: number,
    @Body() dto: AssignEmployeeDto,
  ) {
    return presentService(
      await this.assignEmployeeUseCase.execute(userId, serviceId, dto),
    );
  }

  @Delete('services/:id/employees/:employeeId')
  @UseGuards(ClerkGuard)
  async removeEmployee(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) serviceId: number,
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ) {
    return this.removeEmployeeUseCase.execute(userId, serviceId, employeeId);
  }

  @Get('branches/:id/services')
  async list(@Param('id', ParseIntPipe) branchId: number) {
    return (await this.listActiveServicesByBranchUseCase.execute(branchId)).map(
      presentService,
    );
  }

  /** Público: un Servicio por su tramo del Enlace de reserva, aunque esté oculto. 404 si no hay uno no dado de baja con ese tramo. */
  @Get('branches/:id/services/by-slug/:slug')
  async getBySlug(
    @Param('id', ParseIntPipe) branchId: number,
    @Param('slug') slug: string,
  ) {
    return presentService(
      await this.getServiceBySlugUseCase.execute(branchId, slug),
    );
  }

  @Get('services/:id/slots')
  async slots(
    @Param('id', ParseIntPipe) serviceId: number,
    @Query('employeeId', ParseIntPipe) employeeId: number,
    @Query('from', ParseDatePipe) from: string,
    @Query('to', ParseDatePipe) to: string,
  ) {
    return this.listSlotsUseCase.execute(serviceId, employeeId, from, to);
  }
}

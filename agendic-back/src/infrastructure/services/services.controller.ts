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
  Query,
  UseGuards,
} from '@nestjs/common';
import { AssignEmployeeUseCase } from '../../application/services/assign-employee.use-case';
import { ChangeEmployeeAvailabilityUseCase } from '../../application/services/change-employee-availability.use-case';
import { CreatePersonalServiceUseCase } from '../../application/services/create-personal-service.use-case';
import { CreateServiceUseCase } from '../../application/services/create-service.use-case';
import { GetServiceBySlugUseCase } from '../../application/services/get-service-by-slug.use-case';
import { GetPersonalServiceBySlugUseCase } from '../../application/services/get-personal-service-by-slug.use-case';
import { ListActiveServicesByBranchUseCase } from '../../application/services/list-active-services-by-branch.use-case';
import { ListPersonalServicesUseCase } from '../../application/services/list-personal-services.use-case';
import { ListMyServicesUseCase } from '../../application/services/list-my-services.use-case';
import { RemoveEmployeeUseCase } from '../../application/services/remove-employee.use-case';
import { RetireServiceUseCase } from '../../application/services/retire-service.use-case';
import { UpdateServiceUseCase } from '../../application/services/update-service.use-case';
import { GetUserPageUseCase } from '../../application/users/get-user-page.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { ParseDatePipe } from '../parse-date.pipe';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { presentCatalogGroup, presentService } from './service.presenter';
import {
  AssignEmployeeDto,
  ChangeEmployeeAvailabilityDto,
  CreatePersonalServiceDto,
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
    private readonly changeEmployeeAvailabilityUseCase: ChangeEmployeeAvailabilityUseCase,
    private readonly removeEmployeeUseCase: RemoveEmployeeUseCase,
    private readonly listSlotsUseCase: ListSlotsUseCase,
    private readonly listMyServicesUseCase: ListMyServicesUseCase,
    private readonly createPersonalServiceUseCase: CreatePersonalServiceUseCase,
    private readonly listPersonalServicesUseCase: ListPersonalServicesUseCase,
    private readonly getUserPageUseCase: GetUserPageUseCase,
    private readonly getPersonalServiceBySlugUseCase: GetPersonalServiceBySlugUseCase,
  ) {}

  /** Los Servicios personales del Usuario, ocultos incluidos. */
  @Get('users/me/services')
  @UseGuards(ClerkGuard)
  async listPersonal(@CurrentUser() userId: number) {
    return (await this.listPersonalServicesUseCase.execute(userId)).map(
      presentService,
    );
  }

  @Post('users/me/services')
  @UseGuards(ClerkGuard)
  async createPersonal(
    @CurrentUser() userId: number,
    @Body() dto: CreatePersonalServiceDto,
  ) {
    return presentService(
      await this.createPersonalServiceUseCase.execute(userId, dto),
    );
  }

  /** Público: el Enlace de reserva de un Usuario, con sus Servicios personales no ocultos. 404 si no existe. */
  @Get('u/:userSlug')
  async getUserPage(@Param('userSlug') userSlug: string) {
    const { user, services } = await this.getUserPageUseCase.execute(userSlug);
    return {
      name: user.name,
      slug: user.slug,
      services: services.map(presentService),
    };
  }

  /** Público: un Servicio personal por su tramo, aunque esté oculto. 404 si no existe o está dado de baja. */
  @Get('u/:userSlug/:serviceSlug')
  async getPersonalServiceBySlug(
    @Param('userSlug') userSlug: string,
    @Param('serviceSlug') serviceSlug: string,
  ) {
    return presentService(
      await this.getPersonalServiceBySlugUseCase.execute(userSlug, serviceSlug),
    );
  }

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

  /**
   * Ofrecer: el Dueño por cualquiera del Staff, o el propio Empleado (ADR 0017).
   *
   * @throws {NotFoundError} el Servicio, el Empleado o la Availability no existen, o el Servicio está oculto y quien
   * llama no es Dueño ni lo atiende
   * @throws {ForbiddenError} no es el Dueño ni ese Empleado
   * @throws {BusinessRuleError} el Servicio o el Empleado están dados de baja, o la Availability es de otro Usuario
   * @throws {ConflictError} el Empleado ya lo atiende
   */
  @Post('services/:id/employees')
  @HttpCode(200)
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

  /**
   * Cambia la Availability con la que un Empleado atiende el Servicio; el Dueño o el propio Empleado. No toca Turnos.
   *
   * @throws {NotFoundError} el Servicio o la Availability no existen, o ese Empleado no atiende el Servicio
   * @throws {ForbiddenError} no es el Dueño ni ese Empleado
   * @throws {BusinessRuleError} la Availability es de otro Usuario
   */
  @Patch('services/:id/employees/:employeeId')
  @UseGuards(ClerkGuard)
  async changeEmployeeAvailability(
    @CurrentUser() userId: number,
    @Param('id', ParseIntPipe) serviceId: number,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: ChangeEmployeeAvailabilityDto,
  ) {
    return presentService(
      await this.changeEmployeeAvailabilityUseCase.execute(
        userId,
        serviceId,
        employeeId,
        dto.availabilityId,
      ),
    );
  }

  /**
   * Dejar de ofrecer: el Dueño por cualquiera del Staff, o el propio Empleado (ADR 0017).
   *
   * @throws {NotFoundError} el Servicio o el Empleado no existen
   * @throws {ForbiddenError} no es el Dueño ni ese Empleado
   * @throws {BusinessRuleError} es el último Empleado del Servicio
   */
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
    @Query('from', ParseDatePipe) from: string,
    @Query('to', ParseDatePipe) to: string,
  ) {
    return this.listSlotsUseCase.execute(serviceId, from, to);
  }
}

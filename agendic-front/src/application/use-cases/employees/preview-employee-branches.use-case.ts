import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { BranchCancelledBooking, EmployeeBranches } from '@/src/entities/models/employee';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IPreviewEmployeeBranchesUseCase = ReturnType<typeof previewEmployeeBranchesUseCase>;

/**
 * Los Turnos que cambiar las Sucursales del Empleado cancelaría. No guarda nada. "Solo el Dueño" lo controla el back.
 *
 * @throws {BranchesRequiredError} `branchIds` vino vacío
 * @throws {BranchNotOfBusinessError} una Sucursal no es del Negocio
 * @throws {OwnerWorksAtEveryBranchError} al Empleado del Dueño se le saca una Sucursal
 * @throws {LastEmployeeError} un Servicio se queda sin Empleados
 * @throws {NotFoundError} el Empleado no existe o está dado de baja
 * @throws {ApiRequestError} no es el Dueño (403) u otro error de la API
 */
export const previewEmployeeBranchesUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (input: EmployeeBranches): Promise<BranchCancelledBooking[]> =>
        instrumentationService.startSpan({ name: 'previewEmployeeBranches Use Case', op: 'function' }, () =>
            employeesRepository.previewEmployeeBranches(input),
        );

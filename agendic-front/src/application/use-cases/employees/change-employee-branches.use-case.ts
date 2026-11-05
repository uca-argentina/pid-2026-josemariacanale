import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ConfirmedEmployeeBranches } from '@/src/entities/models/employee';
import type { CancelledBookings } from '@/src/entities/models/left-outside-booking';

/** Tipo del caso de uso ya compuesto, como lo consumen los controllers. */
export type IChangeEmployeeBranchesUseCase = ReturnType<typeof changeEmployeeBranchesUseCase>;

/**
 * Cambia las Sucursales del Empleado y cancela los Turnos que el Dueño confirmó. "Solo el Dueño" lo controla el back.
 *
 * @throws {EmployeeBranchesBookingsChangedError} cambió la lista de Turnos que se cancelan
 * @throws {BranchesRequiredError} `branchIds` vino vacío
 * @throws {BranchNotOfBusinessError} una Sucursal no es del Negocio
 * @throws {OwnerWorksAtEveryBranchError} al Empleado del Dueño se le saca una Sucursal
 * @throws {LastEmployeeError} un Servicio se queda sin Empleados
 */
export const changeEmployeeBranchesUseCase =
    (instrumentationService: IInstrumentationService, employeesRepository: IEmployeesRepository) =>
    (input: ConfirmedEmployeeBranches): Promise<CancelledBookings> =>
        instrumentationService.startSpan({ name: 'changeEmployeeBranches Use Case', op: 'function' }, () =>
            employeesRepository.changeEmployeeBranches(input),
        );

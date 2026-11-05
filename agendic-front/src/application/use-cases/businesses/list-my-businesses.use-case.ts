import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { MyBusiness } from '@/src/entities/models/business';

export type IListMyBusinessesUseCase = ReturnType<typeof listMyBusinessesUseCase>;
/**
 * Lista los Negocios donde el Usuario de la Sesión es Empleado activo, el propio primero.
 *
 * @throws {ApiRequestError} el back falló
 */
export const listMyBusinessesUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (): Promise<MyBusiness[]> =>
        instrumentationService.startSpan({ name: 'listMyBusinesses Use Case', op: 'function' }, () =>
            businessesRepository.listMyBusinesses(),
        );

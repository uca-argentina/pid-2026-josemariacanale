import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { Business } from '@/src/entities/models/business';

export type IListBusinessesUseCase = ReturnType<typeof listBusinessesUseCase>;
// The back lists only the Negocios of the Dueño of the Sesión (0 or 1).
export const listBusinessesUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (): Promise<Business[]> =>
        instrumentationService.startSpan({ name: 'listBusinesses Use Case', op: 'function' }, () =>
            businessesRepository.listBusinesses(),
        );

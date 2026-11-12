import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { SlugAvailability } from '@/src/entities/models/business';

export type ICheckSlugAvailabilityUseCase = ReturnType<typeof checkSlugAvailabilityUseCase>;
/** Whether the Dueño can use the slug as the Enlace de reserva; the back decides (format, reserved word, in use). */
export const checkSlugAvailabilityUseCase =
    (instrumentationService: IInstrumentationService, businessesRepository: IBusinessesRepository) =>
    (slug: string): Promise<SlugAvailability> =>
        instrumentationService.startSpan({ name: 'checkSlugAvailability Use Case', op: 'function' }, () =>
            businessesRepository.checkSlugAvailability(slug),
        );

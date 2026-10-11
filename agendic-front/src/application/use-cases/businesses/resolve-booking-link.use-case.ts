import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { ResolvedBookingLink } from '@/src/entities/models/booking-link';

export type IResolveBookingLinkUseCase = ReturnType<typeof resolveBookingLinkUseCase>;
/**
 * Says whether the first tramo of an Enlace de reserva is a Negocio's or a Usuario's (ADR 0026).
 *
 * @throws {NotFoundError} nobody has that Enlace de reserva
 * @throws {ApiRequestError} the back failed
 */
export const resolveBookingLinkUseCase =
    (instrumentationService: IInstrumentationService, publicBusinessesRepository: IPublicBusinessesRepository) =>
    (input: { slug: string }): Promise<ResolvedBookingLink> =>
        instrumentationService.startSpan({ name: 'resolveBookingLink Use Case', op: 'function' }, () =>
            publicBusinessesRepository.resolveSlug(input.slug),
        );

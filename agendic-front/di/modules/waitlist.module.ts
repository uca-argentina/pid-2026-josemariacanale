import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { getWaitlistEntryByLinkUseCase } from '@/src/application/use-cases/bookings/get-waitlist-entry-by-link.use-case';
import { joinWaitlistUseCase } from '@/src/application/use-cases/bookings/join-waitlist.use-case';
import { leaveWaitlistUseCase } from '@/src/application/use-cases/bookings/leave-waitlist.use-case';
import { WaitlistRepository } from '@/src/infrastructure/repositories/waitlist.repository';
import { getWaitlistEntryByLinkController } from '@/src/interface-adapters/controllers/bookings/get-waitlist-entry-by-link.controller';
import { joinWaitlistController } from '@/src/interface-adapters/controllers/bookings/join-waitlist.controller';
import { leaveWaitlistController } from '@/src/interface-adapters/controllers/bookings/leave-waitlist.controller';

/** Cablea la Lista de espera. Anotarse y Salir son públicos, así que `WaitlistRepository` no recibe `IAuthenticationService`. */
export function createWaitlistModule() {
    const waitlistModule = createModule();

    waitlistModule.bind(DI_SYMBOLS.IWaitlistRepository).toClass(WaitlistRepository, [DI_SYMBOLS.IInstrumentationService]);

    waitlistModule
        .bind(DI_SYMBOLS.IJoinWaitlistUseCase)
        .toHigherOrderFunction(joinWaitlistUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IWaitlistRepository]);

    waitlistModule
        .bind(DI_SYMBOLS.IGetWaitlistEntryByLinkUseCase)
        .toHigherOrderFunction(getWaitlistEntryByLinkUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IWaitlistRepository]);

    waitlistModule
        .bind(DI_SYMBOLS.ILeaveWaitlistUseCase)
        .toHigherOrderFunction(leaveWaitlistUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IWaitlistRepository]);

    waitlistModule
        .bind(DI_SYMBOLS.IJoinWaitlistController)
        .toHigherOrderFunction(joinWaitlistController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IJoinWaitlistUseCase]);

    waitlistModule
        .bind(DI_SYMBOLS.IGetWaitlistEntryByLinkController)
        .toHigherOrderFunction(getWaitlistEntryByLinkController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IGetWaitlistEntryByLinkUseCase,
        ]);

    waitlistModule
        .bind(DI_SYMBOLS.ILeaveWaitlistController)
        .toHigherOrderFunction(leaveWaitlistController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.ILeaveWaitlistUseCase]);

    return waitlistModule;
}

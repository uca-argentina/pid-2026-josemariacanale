import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { joinWaitlistUseCase } from '@/src/application/use-cases/bookings/join-waitlist.use-case';
import { WaitlistRepository } from '@/src/infrastructure/repositories/waitlist.repository';
import { joinWaitlistController } from '@/src/interface-adapters/controllers/bookings/join-waitlist.controller';

/** Cablea la Lista de espera. Anotarse es público, así que `WaitlistRepository` no recibe `IAuthenticationService`. */
export function createWaitlistModule() {
    const waitlistModule = createModule();

    waitlistModule.bind(DI_SYMBOLS.IWaitlistRepository).toClass(WaitlistRepository, [DI_SYMBOLS.IInstrumentationService]);

    waitlistModule
        .bind(DI_SYMBOLS.IJoinWaitlistUseCase)
        .toHigherOrderFunction(joinWaitlistUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IWaitlistRepository]);

    waitlistModule
        .bind(DI_SYMBOLS.IJoinWaitlistController)
        .toHigherOrderFunction(joinWaitlistController, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IJoinWaitlistUseCase]);

    return waitlistModule;
}

import { createModule } from '@evyweb/ioctopus';
import { DI_SYMBOLS } from '@/di/types';
import { createStreakRewardUseCase } from '@/src/application/use-cases/streaks/create-streak-reward.use-case';
import { deleteStreakRewardUseCase } from '@/src/application/use-cases/streaks/delete-streak-reward.use-case';
import { getStreakProgramUseCase } from '@/src/application/use-cases/streaks/get-streak-program.use-case';
import { saveStreakProgramUseCase } from '@/src/application/use-cases/streaks/save-streak-program.use-case';
import { updateStreakRewardUseCase } from '@/src/application/use-cases/streaks/update-streak-reward.use-case';
import { StreakProgramsRepository } from '@/src/infrastructure/repositories/streak-programs.repository';
import { createStreakRewardController } from '@/src/interface-adapters/controllers/streaks/create-streak-reward.controller';
import { deleteStreakRewardController } from '@/src/interface-adapters/controllers/streaks/delete-streak-reward.controller';
import { getStreakProgramController } from '@/src/interface-adapters/controllers/streaks/get-streak-program.controller';
import { saveStreakProgramController } from '@/src/interface-adapters/controllers/streaks/save-streak-program.controller';
import { updateStreakRewardController } from '@/src/interface-adapters/controllers/streaks/update-streak-reward.controller';

export function createStreaksModule() {
    const streaksModule = createModule();

    streaksModule.bind(DI_SYMBOLS.IStreakProgramsRepository).toClass(StreakProgramsRepository, [
        DI_SYMBOLS.IAuthenticationService,
        DI_SYMBOLS.IInstrumentationService,
    ]);

    streaksModule
        .bind(DI_SYMBOLS.IGetStreakProgramUseCase)
        .toHigherOrderFunction(getStreakProgramUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IStreakProgramsRepository]);
    streaksModule
        .bind(DI_SYMBOLS.IGetStreakProgramController)
        .toHigherOrderFunction(getStreakProgramController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IGetStreakProgramUseCase,
        ]);

    streaksModule
        .bind(DI_SYMBOLS.ISaveStreakProgramUseCase)
        .toHigherOrderFunction(saveStreakProgramUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IStreakProgramsRepository]);
    streaksModule
        .bind(DI_SYMBOLS.ISaveStreakProgramController)
        .toHigherOrderFunction(saveStreakProgramController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ISaveStreakProgramUseCase,
        ]);

    streaksModule
        .bind(DI_SYMBOLS.ICreateStreakRewardUseCase)
        .toHigherOrderFunction(createStreakRewardUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IStreakProgramsRepository]);
    streaksModule
        .bind(DI_SYMBOLS.ICreateStreakRewardController)
        .toHigherOrderFunction(createStreakRewardController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.ICreateStreakRewardUseCase,
        ]);

    streaksModule
        .bind(DI_SYMBOLS.IUpdateStreakRewardUseCase)
        .toHigherOrderFunction(updateStreakRewardUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IStreakProgramsRepository]);
    streaksModule
        .bind(DI_SYMBOLS.IUpdateStreakRewardController)
        .toHigherOrderFunction(updateStreakRewardController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IUpdateStreakRewardUseCase,
        ]);

    streaksModule
        .bind(DI_SYMBOLS.IDeleteStreakRewardUseCase)
        .toHigherOrderFunction(deleteStreakRewardUseCase, [DI_SYMBOLS.IInstrumentationService, DI_SYMBOLS.IStreakProgramsRepository]);
    streaksModule
        .bind(DI_SYMBOLS.IDeleteStreakRewardController)
        .toHigherOrderFunction(deleteStreakRewardController, [
            DI_SYMBOLS.IInstrumentationService,
            DI_SYMBOLS.IAuthenticationService,
            DI_SYMBOLS.IDeleteStreakRewardUseCase,
        ]);

    return streaksModule;
}

import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IPublicBusinessRepository } from '@/src/application/repositories/public-business.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import type { IGetPublicBusinessUseCase } from '@/src/application/use-cases/businesses/get-public-business.use-case';
import type { IGetMyBusinessController } from '@/src/interface-adapters/controllers/businesses/get-my-business.controller';
import type { ICreateBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import type { IUpdateBusinessUseCase } from '@/src/application/use-cases/businesses/update-business.use-case';
import type { IUpdateBusinessController } from '@/src/interface-adapters/controllers/businesses/update-business.controller';
import type { ICreateBusinessController } from '@/src/interface-adapters/controllers/businesses/create-business.controller';
import type { IGetPublicBusinessController } from '@/src/interface-adapters/controllers/businesses/get-public-business.controller';
import type { IGetCurrentUserController } from '@/src/interface-adapters/controllers/auth/get-current-user.controller';

export const DI_SYMBOLS = {
    // Services
    IInstrumentationService: Symbol.for('IInstrumentationService'),
    ICrashReporterService: Symbol.for('ICrashReporterService'),
    IAuthenticationService: Symbol.for('IAuthenticationService'),

    // Repositories
    IBusinessesRepository: Symbol.for('IBusinessesRepository'),
    IPublicBusinessRepository: Symbol.for('IPublicBusinessRepository'),

    // Use cases
    ICreateBusinessUseCase: Symbol.for('ICreateBusinessUseCase'),
    IListBusinessesUseCase: Symbol.for('IListBusinessesUseCase'),
    IUpdateBusinessUseCase: Symbol.for('IUpdateBusinessUseCase'),
    IGetPublicBusinessUseCase: Symbol.for('IGetPublicBusinessUseCase'),

    // Controllers
    IGetCurrentUserController: Symbol.for('IGetCurrentUserController'),
    ICreateBusinessController: Symbol.for('ICreateBusinessController'),
    IGetMyBusinessController: Symbol.for('IGetMyBusinessController'),
    IUpdateBusinessController: Symbol.for('IUpdateBusinessController'),
    IGetPublicBusinessController: Symbol.for('IGetPublicBusinessController'),
};

export interface DI_RETURN_TYPES {
    // Services
    IInstrumentationService: IInstrumentationService;
    ICrashReporterService: ICrashReporterService;
    IAuthenticationService: IAuthenticationService;

    // Repositories
    IBusinessesRepository: IBusinessesRepository;
    IPublicBusinessRepository: IPublicBusinessRepository;

    // Use cases
    ICreateBusinessUseCase: ICreateBusinessUseCase;
    IListBusinessesUseCase: IListBusinessesUseCase;
    IUpdateBusinessUseCase: IUpdateBusinessUseCase;
    IGetPublicBusinessUseCase: IGetPublicBusinessUseCase;

    // Controllers
    IGetCurrentUserController: IGetCurrentUserController;
    ICreateBusinessController: ICreateBusinessController;
    IGetMyBusinessController: IGetMyBusinessController;
    IUpdateBusinessController: IUpdateBusinessController;
    IGetPublicBusinessController: IGetPublicBusinessController;
}

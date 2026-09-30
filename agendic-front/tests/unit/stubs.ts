import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

export const instrumentation: IInstrumentationService = { startSpan: (_options, callback) => callback() };

// Unstubbed methods reject, so a test only passes on the calls it declares.
const notStubbed = (name: string) => () => Promise.reject(new Error(`${name} not stubbed`));

export const authWith = (stubs: Partial<IAuthenticationService>): IAuthenticationService => ({
    getCurrentUser: notStubbed('getCurrentUser'),
    getAccessToken: notStubbed('getAccessToken'),
    ...stubs,
});

export const publicBusinessesWith = (stubs: Partial<IPublicBusinessesRepository>): IPublicBusinessesRepository => ({
    getBusinessBySlug: jest.fn(notStubbed('getBusinessBySlug')),
    listBranches: jest.fn(notStubbed('listBranches')),
    listServices: jest.fn(notStubbed('listServices')),
    listBranchImages: jest.fn(notStubbed('listBranchImages')),
    ...stubs,
});

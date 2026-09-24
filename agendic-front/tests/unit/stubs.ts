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

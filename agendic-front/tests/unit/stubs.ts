import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IEmployeeBookingsRepository } from '@/src/application/repositories/employee-bookings.repository.interface';
import type { IOverridesRepository } from '@/src/application/repositories/overrides.repository.interface';
import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
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

export const bookingsWith = (stubs: Partial<IBookingsRepository>): IBookingsRepository => ({
    listSlots: jest.fn(notStubbed('listSlots')),
    book: jest.fn(notStubbed('book')),
    verifyBooking: jest.fn(notStubbed('verifyBooking')),
    ...stubs,
});

export const employeeBookingsWith = (stubs: Partial<IEmployeeBookingsRepository>): IEmployeeBookingsRepository => ({
    listMyBookings: jest.fn(notStubbed('listMyBookings')),
    accept: jest.fn(notStubbed('accept')),
    reject: jest.fn(notStubbed('reject')),
    cancel: jest.fn(notStubbed('cancel')),
    reschedule: jest.fn(notStubbed('reschedule')),
    markNoShow: jest.fn(notStubbed('markNoShow')),
    ...stubs,
});

export const availabilitiesWith = (stubs: Partial<IAvailabilitiesRepository>): IAvailabilitiesRepository => ({
    listAvailabilities: jest.fn(notStubbed('listAvailabilities')),
    createAvailability: jest.fn(notStubbed('createAvailability')),
    updateAvailability: jest.fn(notStubbed('updateAvailability')),
    makeDefault: jest.fn(notStubbed('makeDefault')),
    deleteAvailability: jest.fn(notStubbed('deleteAvailability')),
    ...stubs,
});

export const overridesWith = (stubs: Partial<IOverridesRepository>): IOverridesRepository => ({
    listOverrides: jest.fn(notStubbed('listOverrides')),
    setOverride: jest.fn(notStubbed('setOverride')),
    removeOverride: jest.fn(notStubbed('removeOverride')),
    ...stubs,
});

export const servicesWith = (stubs: Partial<IServicesRepository>): IServicesRepository => ({
    listMyCatalog: jest.fn(notStubbed('listMyCatalog')),
    createService: jest.fn(notStubbed('createService')),
    updateService: jest.fn(notStubbed('updateService')),
    retireService: jest.fn(notStubbed('retireService')),
    assignEmployee: jest.fn(notStubbed('assignEmployee')),
    removeEmployee: jest.fn(notStubbed('removeEmployee')),
    ...stubs,
});

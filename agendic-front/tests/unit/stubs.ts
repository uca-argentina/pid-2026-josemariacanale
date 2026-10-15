import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IHolidaysRepository } from '@/src/application/repositories/holidays.repository.interface';
import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IWaitlistRepository } from '@/src/application/repositories/waitlist.repository.interface';
import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IUserBookingsRepository } from '@/src/application/repositories/user-bookings.repository.interface';
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
    resolveSlug: jest.fn(notStubbed('resolveSlug')),
    getBusinessBySlug: jest.fn(notStubbed('getBusinessBySlug')),
    listBranches: jest.fn(notStubbed('listBranches')),
    listServices: jest.fn(notStubbed('listServices')),
    getServiceBySlug: jest.fn(notStubbed('getServiceBySlug')),
    listBranchImages: jest.fn(notStubbed('listBranchImages')),
    ...stubs,
});

export const bookingsWith = (stubs: Partial<IBookingsRepository>): IBookingsRepository => ({
    listSlots: jest.fn(notStubbed('listSlots')),
    book: jest.fn(notStubbed('book')),
    requestVerificationCode: jest.fn(notStubbed('requestVerificationCode')),
    ...stubs,
});

export const waitlistWith = (stubs: Partial<IWaitlistRepository>): IWaitlistRepository => ({
    join: jest.fn(notStubbed('join')),
    getByLink: jest.fn(notStubbed('getByLink')),
    leave: jest.fn(notStubbed('leave')),
    ...stubs,
});

export const userBookingsWith = (stubs: Partial<IUserBookingsRepository>): IUserBookingsRepository => ({
    listMyBookings: jest.fn(notStubbed('listMyBookings')),
    accept: jest.fn(notStubbed('accept')),
    reject: jest.fn(notStubbed('reject')),
    cancel: jest.fn(notStubbed('cancel')),
    reschedule: jest.fn(notStubbed('reschedule')),
    markNoShow: jest.fn(notStubbed('markNoShow')),
    ...stubs,
});

export const clientBookingsWith = (stubs: Partial<IClientBookingsRepository>): IClientBookingsRepository => ({
    getBookingByLink: jest.fn(notStubbed('getBookingByLink')),
    cancelBookingByLink: jest.fn(notStubbed('cancelBookingByLink')),
    payDepositByLink: jest.fn(notStubbed('payDepositByLink')),
    markEmployeeNoShowByLink: jest.fn(notStubbed('markEmployeeNoShowByLink')),
    rateBookingByLink: jest.fn(notStubbed('rateBookingByLink')),
    rescheduleBookingByLink: jest.fn(notStubbed('rescheduleBookingByLink')),
    ...stubs,
});

export const availabilitiesWith = (stubs: Partial<IAvailabilitiesRepository>): IAvailabilitiesRepository => ({
    listAvailabilities: jest.fn(notStubbed('listAvailabilities')),
    getAvailability: jest.fn(notStubbed('getAvailability')),
    createAvailability: jest.fn(notStubbed('createAvailability')),
    updateAvailability: jest.fn(notStubbed('updateAvailability')),
    makeDefault: jest.fn(notStubbed('makeDefault')),
    deleteAvailability: jest.fn(notStubbed('deleteAvailability')),
    ...stubs,
});

export const outOfOfficeWith = (stubs: Partial<IOutOfOfficeRepository>): IOutOfOfficeRepository => ({
    listOutOfOffice: jest.fn(notStubbed('listOutOfOffice')),
    createOutOfOffice: jest.fn(notStubbed('createOutOfOffice')),
    updateOutOfOffice: jest.fn(notStubbed('updateOutOfOffice')),
    deleteOutOfOffice: jest.fn(notStubbed('deleteOutOfOffice')),
    ...stubs,
});

export const holidaysWith = (stubs: Partial<IHolidaysRepository>): IHolidaysRepository => ({
    listCountries: jest.fn(notStubbed('listCountries')),
    getSettings: jest.fn(notStubbed('getSettings')),
    setCountry: jest.fn(notStubbed('setCountry')),
    setEnabled: jest.fn(notStubbed('setEnabled')),
    listConflicts: jest.fn(notStubbed('listConflicts')),
    ...stubs,
});

export const servicesWith = (stubs: Partial<IServicesRepository>): IServicesRepository => ({
    listMyCatalog: jest.fn(notStubbed('listMyCatalog')),
    listPersonalServices: jest.fn(notStubbed('listPersonalServices')),
    createPersonalService: jest.fn(notStubbed('createPersonalService')),
    createService: jest.fn(notStubbed('createService')),
    updateService: jest.fn(notStubbed('updateService')),
    retireService: jest.fn(notStubbed('retireService')),
    assignEmployee: jest.fn(notStubbed('assignEmployee')),
    removeEmployee: jest.fn(notStubbed('removeEmployee')),
    changeEmployeeAvailability: jest.fn(notStubbed('changeEmployeeAvailability')),
    ...stubs,
});

// The Imágenes de Sucursal methods of IBusinessesRepository, for tests that build the whole repository.
export const imagesStub = {
    uploadBranchImage: jest.fn(),
    deleteBranchImage: jest.fn(),
    reorderBranchImages: jest.fn(),
    uploadBusinessLogo: jest.fn(),
    deleteBusinessLogo: jest.fn(),
};

/** Una Anotación como la devuelve GET /waitlist-links/:secret, de un Servicio del Negocio. */
export const waitlistEntryView = {
    date: '2026-10-20',
    timeZone: 'America/Argentina/Buenos_Aires',
    left: false,
    service: { name: 'Masaje', slug: 'masaje' },
    business: { name: 'Spa Sol', slug: 'spa-sol' },
    branch: { name: 'Centro', slug: 'centro' },
    user: null,
};

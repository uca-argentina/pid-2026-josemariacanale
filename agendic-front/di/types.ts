import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { ICabinsRepository } from '@/src/application/repositories/cabins.repository.interface';
import type { IListCabinsUseCase } from '@/src/application/use-cases/cabins/list-cabins.use-case';
import type { IListCabinsController } from '@/src/interface-adapters/controllers/cabins/list-cabins.controller';
import type { ICreateCabinUseCase } from '@/src/application/use-cases/cabins/create-cabin.use-case';
import type { ICreateCabinController } from '@/src/interface-adapters/controllers/cabins/create-cabin.controller';
import type { IRenameCabinUseCase } from '@/src/application/use-cases/cabins/rename-cabin.use-case';
import type { IRenameCabinController } from '@/src/interface-adapters/controllers/cabins/rename-cabin.controller';
import type { IRetireCabinUseCase } from '@/src/application/use-cases/cabins/retire-cabin.use-case';
import type { IRetireCabinController } from '@/src/interface-adapters/controllers/cabins/retire-cabin.controller';
import type { IBranchesRepository } from '@/src/application/repositories/branches.repository.interface';
import type { ICreateBranchUseCase } from '@/src/application/use-cases/branches/create-branch.use-case';
import type { IUpdateBranchUseCase } from '@/src/application/use-cases/branches/update-branch.use-case';
import type { IListBranchesWithImagesUseCase } from '@/src/application/use-cases/branches/list-branches-with-images.use-case';
import type { ICreateBranchController } from '@/src/interface-adapters/controllers/branches/create-branch.controller';
import type { IUpdateBranchController } from '@/src/interface-adapters/controllers/branches/update-branch.controller';
import type { IListBranchesWithImagesController } from '@/src/interface-adapters/controllers/branches/list-branches-with-images.controller';
import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import type { IGetPublicBusinessUseCase } from '@/src/application/use-cases/businesses/get-public-business.use-case';
import type { IGetPublicBranchUseCase } from '@/src/application/use-cases/businesses/get-public-branch.use-case';
import type { IGetPublicBusinessController } from '@/src/interface-adapters/controllers/businesses/get-public-business.controller';
import type { IResolveBookingLinkUseCase } from '@/src/application/use-cases/businesses/resolve-booking-link.use-case';
import type { IResolveBookingLinkController } from '@/src/interface-adapters/controllers/businesses/resolve-booking-link.controller';
import type { IGetPublicBranchController } from '@/src/interface-adapters/controllers/businesses/get-public-branch.controller';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import type { IGetMyBusinessController } from '@/src/interface-adapters/controllers/businesses/get-my-business.controller';
import type { ICreateBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
import type { IUploadBranchImageUseCase } from '@/src/application/use-cases/businesses/upload-branch-image.use-case';
import type { IUploadBranchImageController } from '@/src/interface-adapters/controllers/businesses/upload-branch-image.controller';
import type { IDeleteBranchImageUseCase } from '@/src/application/use-cases/businesses/delete-branch-image.use-case';
import type { IDeleteBranchImageController } from '@/src/interface-adapters/controllers/businesses/delete-branch-image.controller';
import type { IReorderBranchImagesUseCase } from '@/src/application/use-cases/businesses/reorder-branch-images.use-case';
import type { IReorderBranchImagesController } from '@/src/interface-adapters/controllers/businesses/reorder-branch-images.controller';
import type { IUploadBusinessLogoUseCase } from '@/src/application/use-cases/businesses/upload-business-logo.use-case';
import type { IUploadBusinessLogoController } from '@/src/interface-adapters/controllers/businesses/upload-business-logo.controller';
import type { IDeleteBusinessLogoUseCase } from '@/src/application/use-cases/businesses/delete-business-logo.use-case';
import type { IDeleteBusinessLogoController } from '@/src/interface-adapters/controllers/businesses/delete-business-logo.controller';
import type { IUpdateBusinessUseCase } from '@/src/application/use-cases/businesses/update-business.use-case';
import type { IUpdateBusinessController } from '@/src/interface-adapters/controllers/businesses/update-business.controller';
import type { ICreateBusinessController } from '@/src/interface-adapters/controllers/businesses/create-business.controller';
import type { IGetCurrentUserController } from '@/src/interface-adapters/controllers/auth/get-current-user.controller';
import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import type { IListEmployeesUseCase } from '@/src/application/use-cases/employees/list-employees.use-case';
import type { IListInvitationsUseCase } from '@/src/application/use-cases/employees/list-invitations.use-case';
import type { IAddEmployeeUseCase } from '@/src/application/use-cases/employees/add-employee.use-case';
import type { IRetireEmployeeUseCase } from '@/src/application/use-cases/employees/retire-employee.use-case';
import type { IListMyEmployeesController } from '@/src/interface-adapters/controllers/employees/list-my-employees.controller';
import type { IAddEmployeeController } from '@/src/interface-adapters/controllers/employees/add-employee.controller';
import type { IListMyInvitationsUseCase } from '@/src/application/use-cases/employees/list-my-invitations.use-case';
import type { IAcceptInvitationUseCase } from '@/src/application/use-cases/employees/accept-invitation.use-case';
import type { IResendInvitationUseCase } from '@/src/application/use-cases/employees/resend-invitation.use-case';
import type { ICancelInvitationUseCase } from '@/src/application/use-cases/employees/cancel-invitation.use-case';
import type { IResendInvitationController } from '@/src/interface-adapters/controllers/employees/resend-invitation.controller';
import type { ICancelInvitationController } from '@/src/interface-adapters/controllers/employees/cancel-invitation.controller';
import type { IRejectInvitationUseCase } from '@/src/application/use-cases/employees/reject-invitation.use-case';
import type { IListMyInvitationsController } from '@/src/interface-adapters/controllers/employees/list-my-invitations.controller';
import type { IAcceptInvitationController } from '@/src/interface-adapters/controllers/employees/accept-invitation.controller';
import type { IRejectInvitationController } from '@/src/interface-adapters/controllers/employees/reject-invitation.controller';
import type { IBookingsRepository } from '@/src/application/repositories/bookings.repository.interface';
import type { IListSlotsUseCase } from '@/src/application/use-cases/bookings/list-slots.use-case';
import type { IBookSlotUseCase } from '@/src/application/use-cases/bookings/book-slot.use-case';
import type { IListSlotsController } from '@/src/interface-adapters/controllers/bookings/list-slots.controller';
import type { IListSeriesSlotsUseCase } from '@/src/application/use-cases/bookings/list-series-slots.use-case';
import type { IListSeriesSlotsController } from '@/src/interface-adapters/controllers/bookings/list-series-slots.controller';
import type { IRequestVerificationCodeUseCase } from '@/src/application/use-cases/bookings/request-verification-code.use-case';
import type { IRequestVerificationCodeController } from '@/src/interface-adapters/controllers/bookings/request-verification-code.controller';
import type { IBookSlotController } from '@/src/interface-adapters/controllers/bookings/book-slot.controller';
import type { IWaitlistRepository } from '@/src/application/repositories/waitlist.repository.interface';
import type { IJoinWaitlistUseCase } from '@/src/application/use-cases/bookings/join-waitlist.use-case';
import type { IJoinWaitlistController } from '@/src/interface-adapters/controllers/bookings/join-waitlist.controller';
import type { IGetWaitlistEntryByLinkUseCase } from '@/src/application/use-cases/bookings/get-waitlist-entry-by-link.use-case';
import type { ILeaveWaitlistUseCase } from '@/src/application/use-cases/bookings/leave-waitlist.use-case';
import type { IGetWaitlistEntryByLinkController } from '@/src/interface-adapters/controllers/bookings/get-waitlist-entry-by-link.controller';
import type { ILeaveWaitlistController } from '@/src/interface-adapters/controllers/bookings/leave-waitlist.controller';
import type { IRetireEmployeeController } from '@/src/interface-adapters/controllers/employees/retire-employee.controller';
import type { IServicesRepository } from '@/src/application/repositories/services.repository.interface';
import type { IListMyServicesUseCase } from '@/src/application/use-cases/services/list-my-services.use-case';
import type { ICreateServiceUseCase } from '@/src/application/use-cases/services/create-service.use-case';
import type { IGetMyServiceUseCase } from '@/src/application/use-cases/services/get-my-service.use-case';
import type { IUpdateServiceUseCase } from '@/src/application/use-cases/services/update-service.use-case';
import type { IRetireServiceUseCase } from '@/src/application/use-cases/services/retire-service.use-case';
import type { IAssignEmployeeUseCase } from '@/src/application/use-cases/services/assign-employee.use-case';
import type { IRemoveEmployeeUseCase } from '@/src/application/use-cases/services/remove-employee.use-case';
import type { IChangeEmployeeAvailabilityUseCase } from '@/src/application/use-cases/services/change-employee-availability.use-case';
import type { IListMyServicesController } from '@/src/interface-adapters/controllers/services/list-my-services.controller';
import type { ICreateServiceController } from '@/src/interface-adapters/controllers/services/create-service.controller';
import type { IGetMyServiceController } from '@/src/interface-adapters/controllers/services/get-my-service.controller';
import type { IUpdateServiceController } from '@/src/interface-adapters/controllers/services/update-service.controller';
import type { IRetireServiceController } from '@/src/interface-adapters/controllers/services/retire-service.controller';
import type { IAssignEmployeeController } from '@/src/interface-adapters/controllers/services/assign-employee.controller';
import type { IRemoveEmployeeController } from '@/src/interface-adapters/controllers/services/remove-employee.controller';
import type { IChangeEmployeeAvailabilityController } from '@/src/interface-adapters/controllers/services/change-employee-availability.controller';
import type { IUsersRepository } from '@/src/application/repositories/users.repository.interface';
import type { IGetMeUseCase } from '@/src/application/use-cases/users/get-me.use-case';
import type { IUpdateMySlugUseCase } from '@/src/application/use-cases/users/update-my-slug.use-case';
import type { IGetUserPageUseCase } from '@/src/application/use-cases/users/get-user-page.use-case';
import type { IRetireMeUseCase } from '@/src/application/use-cases/users/retire-me.use-case';
import type { IUpdateMyPreferencesUseCase } from '@/src/application/use-cases/users/update-my-preferences.use-case';
import type { IUpdateMyPreferencesController } from '@/src/interface-adapters/controllers/users/update-my-preferences.controller';
import type { IGetMyPreferencesController } from '@/src/interface-adapters/controllers/users/get-my-preferences.controller';
import type { IRetireMeController } from '@/src/interface-adapters/controllers/users/retire-me.controller';
import type { IUpdateMySlugController } from '@/src/interface-adapters/controllers/users/update-my-slug.controller';
import type { IGetUserPageController } from '@/src/interface-adapters/controllers/users/get-user-page.controller';
import type { IListPersonalServicesUseCase } from '@/src/application/use-cases/services/list-personal-services.use-case';
import type { ICreatePersonalServiceUseCase } from '@/src/application/use-cases/services/create-personal-service.use-case';
import type { IListMyPersonalServicesController } from '@/src/interface-adapters/controllers/services/list-my-personal-services.controller';
import type { ICreatePersonalServiceController } from '@/src/interface-adapters/controllers/services/create-personal-service.controller';
import type { IUserBookingsRepository } from '@/src/application/repositories/user-bookings.repository.interface';
import type { IListMyBookingsUseCase } from '@/src/application/use-cases/bookings/list-my-bookings.use-case';
import type { IListMyBookingsController } from '@/src/interface-adapters/controllers/bookings/list-my-bookings.controller';
import type { IMarkBookingNoShowUseCase } from '@/src/application/use-cases/bookings/mark-booking-no-show.use-case';
import type { IMarkBookingNoShowController } from '@/src/interface-adapters/controllers/bookings/mark-booking-no-show.controller';
import type { IGetBookingHistoryUseCase } from '@/src/application/use-cases/bookings/get-booking-history.use-case';
import type { IGetBookingHistoryController } from '@/src/interface-adapters/controllers/bookings/get-booking-history.controller';
import type { IUnmarkBookingNoShowUseCase } from '@/src/application/use-cases/bookings/unmark-booking-no-show.use-case';
import type { IUnmarkBookingNoShowController } from '@/src/interface-adapters/controllers/bookings/unmark-booking-no-show.controller';

import type { IRescheduleBookingUseCase } from '@/src/application/use-cases/bookings/reschedule-booking.use-case';
import type { IRescheduleBookingController } from '@/src/interface-adapters/controllers/bookings/reschedule-booking.controller';
import type { ICancelBookingUseCase } from '@/src/application/use-cases/bookings/cancel-booking.use-case';
import type { ICancelBookingController } from '@/src/interface-adapters/controllers/bookings/cancel-booking.controller';
import type { IRejectBookingUseCase } from '@/src/application/use-cases/bookings/reject-booking.use-case';
import type { IRejectBookingController } from '@/src/interface-adapters/controllers/bookings/reject-booking.controller';
import type { IAcceptBookingUseCase } from '@/src/application/use-cases/bookings/accept-booking.use-case';
import type { IAcceptBookingController } from '@/src/interface-adapters/controllers/bookings/accept-booking.controller';
import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IGetBookingByLinkUseCase } from '@/src/application/use-cases/bookings/get-booking-by-link.use-case';
import type { IGetBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/get-booking-by-link.controller';
import type { ICancelBookingByLinkUseCase } from '@/src/application/use-cases/bookings/cancel-booking-by-link.use-case';
import type { ICancelBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/cancel-booking-by-link.controller';
import type { ICancelBookingSeriesByLinkUseCase } from '@/src/application/use-cases/bookings/cancel-booking-series-by-link.use-case';
import type { ICancelBookingSeriesByLinkController } from '@/src/interface-adapters/controllers/bookings/cancel-booking-series-by-link.controller';
import type { IRateBookingByLinkUseCase } from '@/src/application/use-cases/bookings/rate-booking-by-link.use-case';
import type { IRateBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/rate-booking-by-link.controller';
import type { IMarkEmployeeNoShowByLinkUseCase } from '@/src/application/use-cases/bookings/mark-employee-no-show-by-link.use-case';
import type { IMarkEmployeeNoShowByLinkController } from '@/src/interface-adapters/controllers/bookings/mark-employee-no-show-by-link.controller';
import type { IPayDepositByLinkUseCase } from '@/src/application/use-cases/bookings/pay-deposit-by-link.use-case';
import type { IPayDepositByLinkController } from '@/src/interface-adapters/controllers/bookings/pay-deposit-by-link.controller';
import type { IRescheduleBookingByLinkUseCase } from '@/src/application/use-cases/bookings/reschedule-booking-by-link.use-case';
import type { IRescheduleBookingByLinkController } from '@/src/interface-adapters/controllers/bookings/reschedule-booking-by-link.controller';
import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IListAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import type { IGetAvailabilityUseCase } from '@/src/application/use-cases/availabilities/get-availability.use-case';
import type { ICreateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/create-availability.use-case';
import type { IPreviewUpdateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/preview-update-availability.use-case';
import type { IUpdateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/update-availability.use-case';
import type { IMakeAvailabilityDefaultUseCase } from '@/src/application/use-cases/availabilities/make-availability-default.use-case';
import type { IDeleteAvailabilityUseCase } from '@/src/application/use-cases/availabilities/delete-availability.use-case';
import type { IAnalyticsRepository } from '@/src/application/repositories/analytics.repository.interface';
import type { IGetPersonalAnalyticsUseCase } from '@/src/application/use-cases/analytics/get-personal-analytics.use-case';
import type { IGetBusinessAnalyticsUseCase } from '@/src/application/use-cases/analytics/get-business-analytics.use-case';
import type { IListAnalyticsBusinessesUseCase } from '@/src/application/use-cases/analytics/list-analytics-businesses.use-case';
import type { IDownloadBookingsCsvUseCase } from '@/src/application/use-cases/analytics/download-bookings-csv.use-case';
import type { IDownloadBookingsCsvController } from '@/src/interface-adapters/controllers/analytics/download-bookings-csv.controller';
import type { IGetEmployeesPerPeriodUseCase } from '@/src/application/use-cases/analytics/get-employees-per-period.use-case';
import type { IGetEmployeesPerPeriodController } from '@/src/interface-adapters/controllers/analytics/get-employees-per-period.controller';
import type { IGetBusinessAnalyticsController } from '@/src/interface-adapters/controllers/analytics/get-business-analytics.controller';
import type { IListAnalyticsBusinessesController } from '@/src/interface-adapters/controllers/analytics/list-analytics-businesses.controller';
import type { IGetPersonalAnalyticsController } from '@/src/interface-adapters/controllers/analytics/get-personal-analytics.controller';
import type { IOutOfOfficeRepository } from '@/src/application/repositories/out-of-office.repository.interface';
import type { IListOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/list-out-of-office.use-case';
import type { IListMyOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/list-my-out-of-office.controller';
import type { ICreateOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/create-out-of-office.controller';
import type { IUpdateOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/update-out-of-office.controller';
import type { IDeleteOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/delete-out-of-office.controller';
import type { ICreateOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/create-out-of-office.use-case';
import type { IUpdateOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/update-out-of-office.use-case';
import type { IDeleteOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/delete-out-of-office.use-case';
import type { IPreviewOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/preview-out-of-office.use-case';
import type { IPreviewUpdateOutOfOfficeUseCase } from '@/src/application/use-cases/out-of-office/preview-update-out-of-office.use-case';
import type { IPreviewUpdateOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/preview-update-out-of-office.controller';
import type { IPreviewOutOfOfficeController } from '@/src/interface-adapters/controllers/out-of-office/preview-out-of-office.controller';
import type { IHolidaysRepository } from '@/src/application/repositories/holidays.repository.interface';
import type { IListHolidayCountriesUseCase } from '@/src/application/use-cases/holidays/list-holiday-countries.use-case';
import type { IListHolidayCountriesController } from '@/src/interface-adapters/controllers/holidays/list-holiday-countries.controller';
import type { IGetMyHolidaysUseCase } from '@/src/application/use-cases/holidays/get-my-holidays.use-case';
import type { IGetMyHolidaysController } from '@/src/interface-adapters/controllers/holidays/get-my-holidays.controller';
import type { ISetHolidayCountryUseCase } from '@/src/application/use-cases/holidays/set-holiday-country.use-case';
import type { ISetHolidayCountryController } from '@/src/interface-adapters/controllers/holidays/set-holiday-country.controller';
import type { IToggleHolidayUseCase } from '@/src/application/use-cases/holidays/toggle-holiday.use-case';
import type { IToggleHolidayController } from '@/src/interface-adapters/controllers/holidays/toggle-holiday.controller';
import type { IListHolidayConflictsUseCase } from '@/src/application/use-cases/holidays/list-holiday-conflicts.use-case';
import type { IListHolidayConflictsController } from '@/src/interface-adapters/controllers/holidays/list-holiday-conflicts.controller';
import type { IPreviewSetHolidayCountryUseCase } from '@/src/application/use-cases/holidays/preview-set-holiday-country.use-case';
import type { IPreviewSetHolidayCountryController } from '@/src/interface-adapters/controllers/holidays/preview-set-holiday-country.controller';
import type { IPreviewToggleHolidayUseCase } from '@/src/application/use-cases/holidays/preview-toggle-holiday.use-case';
import type { IPreviewToggleHolidayController } from '@/src/interface-adapters/controllers/holidays/preview-toggle-holiday.controller';
import type { IListMyAvailabilitiesController } from '@/src/interface-adapters/controllers/availabilities/list-my-availabilities.controller';
import type { ICreateAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/create-availability.controller';
import type { IPreviewUpdateAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/preview-update-availability.controller';
import type { IUpdateAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/update-availability.controller';
import type { IMakeAvailabilityDefaultController } from '@/src/interface-adapters/controllers/availabilities/make-availability-default.controller';
import type { IDeleteAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/delete-availability.controller';

export const DI_SYMBOLS = {
    IInstrumentationService: Symbol.for('IInstrumentationService'),
    ICrashReporterService: Symbol.for('ICrashReporterService'),
    IAuthenticationService: Symbol.for('IAuthenticationService'),

    IBusinessesRepository: Symbol.for('IBusinessesRepository'),
    IPublicBusinessesRepository: Symbol.for('IPublicBusinessesRepository'),
    IBranchesRepository: Symbol.for('IBranchesRepository'),
    ICabinsRepository: Symbol.for('ICabinsRepository'),
    IEmployeesRepository: Symbol.for('IEmployeesRepository'),
    IBookingsRepository: Symbol.for('IBookingsRepository'),
    IUserBookingsRepository: Symbol.for('IUserBookingsRepository'),
    IClientBookingsRepository: Symbol.for('IClientBookingsRepository'),
    IWaitlistRepository: Symbol.for('IWaitlistRepository'),
    IAvailabilitiesRepository: Symbol.for('IAvailabilitiesRepository'),
    IOutOfOfficeRepository: Symbol.for('IOutOfOfficeRepository'),
    IAnalyticsRepository: Symbol.for('IAnalyticsRepository'),
    IHolidaysRepository: Symbol.for('IHolidaysRepository'),
    IServicesRepository: Symbol.for('IServicesRepository'),

    ICreateBranchUseCase: Symbol.for('ICreateBranchUseCase'),
    IUpdateBranchUseCase: Symbol.for('IUpdateBranchUseCase'),
    IListBranchesWithImagesUseCase: Symbol.for('IListBranchesWithImagesUseCase'),
    IListCabinsUseCase: Symbol.for('IListCabinsUseCase'),
    ICreateCabinUseCase: Symbol.for('ICreateCabinUseCase'),
    IRenameCabinUseCase: Symbol.for('IRenameCabinUseCase'),
    IRetireCabinUseCase: Symbol.for('IRetireCabinUseCase'),
    ICreateBusinessUseCase: Symbol.for('ICreateBusinessUseCase'),
    IListBusinessesUseCase: Symbol.for('IListBusinessesUseCase'),
    IUpdateBusinessUseCase: Symbol.for('IUpdateBusinessUseCase'),
    IUploadBusinessLogoUseCase: Symbol.for('IUploadBusinessLogoUseCase'),
    IDeleteBusinessLogoUseCase: Symbol.for('IDeleteBusinessLogoUseCase'),
    IUploadBranchImageUseCase: Symbol.for('IUploadBranchImageUseCase'),
    IDeleteBranchImageUseCase: Symbol.for('IDeleteBranchImageUseCase'),
    IReorderBranchImagesUseCase: Symbol.for('IReorderBranchImagesUseCase'),
    IGetPublicBusinessUseCase: Symbol.for('IGetPublicBusinessUseCase'),
    IGetPublicBranchUseCase: Symbol.for('IGetPublicBranchUseCase'),
    IResolveBookingLinkUseCase: Symbol.for('IResolveBookingLinkUseCase'),
    IListEmployeesUseCase: Symbol.for('IListEmployeesUseCase'),
    IAddEmployeeUseCase: Symbol.for('IAddEmployeeUseCase'),
    IListInvitationsUseCase: Symbol.for('IListInvitationsUseCase'),
    IRetireEmployeeUseCase: Symbol.for('IRetireEmployeeUseCase'),
    IListMyServicesUseCase: Symbol.for('IListMyServicesUseCase'),
    ICreateServiceUseCase: Symbol.for('ICreateServiceUseCase'),
    IGetMyServiceUseCase: Symbol.for('IGetMyServiceUseCase'),
    IUpdateServiceUseCase: Symbol.for('IUpdateServiceUseCase'),
    IRetireServiceUseCase: Symbol.for('IRetireServiceUseCase'),
    IAssignEmployeeUseCase: Symbol.for('IAssignEmployeeUseCase'),
    IRemoveEmployeeUseCase: Symbol.for('IRemoveEmployeeUseCase'),
    IChangeEmployeeAvailabilityUseCase: Symbol.for('IChangeEmployeeAvailabilityUseCase'),
    IRejectInvitationUseCase: Symbol.for('IRejectInvitationUseCase'),
    IResendInvitationUseCase: Symbol.for('IResendInvitationUseCase'),
    ICancelInvitationUseCase: Symbol.for('ICancelInvitationUseCase'),
    IAcceptInvitationUseCase: Symbol.for('IAcceptInvitationUseCase'),
    IListMyInvitationsUseCase: Symbol.for('IListMyInvitationsUseCase'),
    IListSlotsUseCase: Symbol.for('IListSlotsUseCase'),
    IListSeriesSlotsUseCase: Symbol.for('IListSeriesSlotsUseCase'),
    IBookSlotUseCase: Symbol.for('IBookSlotUseCase'),
    IRequestVerificationCodeUseCase: Symbol.for('IRequestVerificationCodeUseCase'),
    IListMyBookingsUseCase: Symbol.for('IListMyBookingsUseCase'),
    IMarkBookingNoShowUseCase: Symbol.for('IMarkBookingNoShowUseCase'),
    IGetBookingHistoryUseCase: Symbol.for('IGetBookingHistoryUseCase'),
    IUnmarkBookingNoShowUseCase: Symbol.for('IUnmarkBookingNoShowUseCase'),

    IRescheduleBookingUseCase: Symbol.for('IRescheduleBookingUseCase'),
    ICancelBookingUseCase: Symbol.for('ICancelBookingUseCase'),
    IRejectBookingUseCase: Symbol.for('IRejectBookingUseCase'),
    IAcceptBookingUseCase: Symbol.for('IAcceptBookingUseCase'),
    IGetBookingByLinkUseCase: Symbol.for('IGetBookingByLinkUseCase'),
    ICancelBookingByLinkUseCase: Symbol.for('ICancelBookingByLinkUseCase'),
    ICancelBookingSeriesByLinkUseCase: Symbol.for('ICancelBookingSeriesByLinkUseCase'),
    IPayDepositByLinkUseCase: Symbol.for('IPayDepositByLinkUseCase'),
    IMarkEmployeeNoShowByLinkUseCase: Symbol.for('IMarkEmployeeNoShowByLinkUseCase'),
    IRateBookingByLinkUseCase: Symbol.for('IRateBookingByLinkUseCase'),
    IRescheduleBookingByLinkUseCase: Symbol.for('IRescheduleBookingByLinkUseCase'),
    IJoinWaitlistUseCase: Symbol.for('IJoinWaitlistUseCase'),
    IGetWaitlistEntryByLinkUseCase: Symbol.for('IGetWaitlistEntryByLinkUseCase'),
    ILeaveWaitlistUseCase: Symbol.for('ILeaveWaitlistUseCase'),
    IListAvailabilitiesUseCase: Symbol.for('IListAvailabilitiesUseCase'),
    IGetAvailabilityUseCase: Symbol.for('IGetAvailabilityUseCase'),
    ICreateAvailabilityUseCase: Symbol.for('ICreateAvailabilityUseCase'),
    IPreviewUpdateAvailabilityUseCase: Symbol.for('IPreviewUpdateAvailabilityUseCase'),
    IUpdateAvailabilityUseCase: Symbol.for('IUpdateAvailabilityUseCase'),
    IMakeAvailabilityDefaultUseCase: Symbol.for('IMakeAvailabilityDefaultUseCase'),
    IDeleteAvailabilityUseCase: Symbol.for('IDeleteAvailabilityUseCase'),
    IGetPersonalAnalyticsUseCase: Symbol.for('IGetPersonalAnalyticsUseCase'),
    IListAnalyticsBusinessesUseCase: Symbol.for('IListAnalyticsBusinessesUseCase'),
    IGetBusinessAnalyticsUseCase: Symbol.for('IGetBusinessAnalyticsUseCase'),
    IGetEmployeesPerPeriodUseCase: Symbol.for('IGetEmployeesPerPeriodUseCase'),
    IDownloadBookingsCsvUseCase: Symbol.for('IDownloadBookingsCsvUseCase'),
    IListOutOfOfficeUseCase: Symbol.for('IListOutOfOfficeUseCase'),
    ICreateOutOfOfficeUseCase: Symbol.for('ICreateOutOfOfficeUseCase'),
    IUpdateOutOfOfficeUseCase: Symbol.for('IUpdateOutOfOfficeUseCase'),
    IDeleteOutOfOfficeUseCase: Symbol.for('IDeleteOutOfOfficeUseCase'),
    IPreviewOutOfOfficeUseCase: Symbol.for('IPreviewOutOfOfficeUseCase'),
    IPreviewUpdateOutOfOfficeUseCase: Symbol.for('IPreviewUpdateOutOfOfficeUseCase'),
    IListHolidayCountriesUseCase: Symbol.for('IListHolidayCountriesUseCase'),
    IGetMyHolidaysUseCase: Symbol.for('IGetMyHolidaysUseCase'),
    ISetHolidayCountryUseCase: Symbol.for('ISetHolidayCountryUseCase'),
    IToggleHolidayUseCase: Symbol.for('IToggleHolidayUseCase'),
    IListHolidayConflictsUseCase: Symbol.for('IListHolidayConflictsUseCase'),
    IPreviewSetHolidayCountryUseCase: Symbol.for('IPreviewSetHolidayCountryUseCase'),
    IPreviewToggleHolidayUseCase: Symbol.for('IPreviewToggleHolidayUseCase'),

    IGetCurrentUserController: Symbol.for('IGetCurrentUserController'),
    ICreateBranchController: Symbol.for('ICreateBranchController'),
    IUpdateBranchController: Symbol.for('IUpdateBranchController'),
    IListBranchesWithImagesController: Symbol.for('IListBranchesWithImagesController'),
    IListCabinsController: Symbol.for('IListCabinsController'),
    ICreateCabinController: Symbol.for('ICreateCabinController'),
    IRenameCabinController: Symbol.for('IRenameCabinController'),
    IRetireCabinController: Symbol.for('IRetireCabinController'),
    ICreateBusinessController: Symbol.for('ICreateBusinessController'),
    IGetMyBusinessController: Symbol.for('IGetMyBusinessController'),
    IUpdateBusinessController: Symbol.for('IUpdateBusinessController'),
    IUploadBusinessLogoController: Symbol.for('IUploadBusinessLogoController'),
    IDeleteBusinessLogoController: Symbol.for('IDeleteBusinessLogoController'),
    IUploadBranchImageController: Symbol.for('IUploadBranchImageController'),
    IDeleteBranchImageController: Symbol.for('IDeleteBranchImageController'),
    IReorderBranchImagesController: Symbol.for('IReorderBranchImagesController'),
    IGetPublicBusinessController: Symbol.for('IGetPublicBusinessController'),
    IGetPublicBranchController: Symbol.for('IGetPublicBranchController'),
    IResolveBookingLinkController: Symbol.for('IResolveBookingLinkController'),
    IListMyEmployeesController: Symbol.for('IListMyEmployeesController'),
    IAddEmployeeController: Symbol.for('IAddEmployeeController'),
    IRetireEmployeeController: Symbol.for('IRetireEmployeeController'),
    IListMyServicesController: Symbol.for('IListMyServicesController'),
    ICreateServiceController: Symbol.for('ICreateServiceController'),
    IGetMyServiceController: Symbol.for('IGetMyServiceController'),
    IUpdateServiceController: Symbol.for('IUpdateServiceController'),
    IRetireServiceController: Symbol.for('IRetireServiceController'),
    IAssignEmployeeController: Symbol.for('IAssignEmployeeController'),
    IRemoveEmployeeController: Symbol.for('IRemoveEmployeeController'),
    IChangeEmployeeAvailabilityController: Symbol.for('IChangeEmployeeAvailabilityController'),
    IUsersRepository: Symbol.for('IUsersRepository'),
    IGetMeUseCase: Symbol.for('IGetMeUseCase'),
    IUpdateMySlugUseCase: Symbol.for('IUpdateMySlugUseCase'),
    IGetUserPageUseCase: Symbol.for('IGetUserPageUseCase'),
    IUpdateMySlugController: Symbol.for('IUpdateMySlugController'),
    IRetireMeUseCase: Symbol.for('IRetireMeUseCase'),
    IRetireMeController: Symbol.for('IRetireMeController'),
    IUpdateMyPreferencesUseCase: Symbol.for('IUpdateMyPreferencesUseCase'),
    IUpdateMyPreferencesController: Symbol.for('IUpdateMyPreferencesController'),
    IGetMyPreferencesController: Symbol.for('IGetMyPreferencesController'),
    IGetUserPageController: Symbol.for('IGetUserPageController'),
    IListPersonalServicesUseCase: Symbol.for('IListPersonalServicesUseCase'),
    ICreatePersonalServiceUseCase: Symbol.for('ICreatePersonalServiceUseCase'),
    IListMyPersonalServicesController: Symbol.for('IListMyPersonalServicesController'),
    ICreatePersonalServiceController: Symbol.for('ICreatePersonalServiceController'),
    IRejectInvitationController: Symbol.for('IRejectInvitationController'),
    IResendInvitationController: Symbol.for('IResendInvitationController'),
    ICancelInvitationController: Symbol.for('ICancelInvitationController'),
    IAcceptInvitationController: Symbol.for('IAcceptInvitationController'),
    IListMyInvitationsController: Symbol.for('IListMyInvitationsController'),
    IListSlotsController: Symbol.for('IListSlotsController'),
    IListSeriesSlotsController: Symbol.for('IListSeriesSlotsController'),
    IBookSlotController: Symbol.for('IBookSlotController'),
    IRequestVerificationCodeController: Symbol.for('IRequestVerificationCodeController'),
    IListMyBookingsController: Symbol.for('IListMyBookingsController'),
    IMarkBookingNoShowController: Symbol.for('IMarkBookingNoShowController'),
    IGetBookingHistoryController: Symbol.for('IGetBookingHistoryController'),
    IUnmarkBookingNoShowController: Symbol.for('IUnmarkBookingNoShowController'),

    IRescheduleBookingController: Symbol.for('IRescheduleBookingController'),
    ICancelBookingController: Symbol.for('ICancelBookingController'),
    IRejectBookingController: Symbol.for('IRejectBookingController'),
    IAcceptBookingController: Symbol.for('IAcceptBookingController'),
    IGetBookingByLinkController: Symbol.for('IGetBookingByLinkController'),
    ICancelBookingByLinkController: Symbol.for('ICancelBookingByLinkController'),
    ICancelBookingSeriesByLinkController: Symbol.for('ICancelBookingSeriesByLinkController'),
    IPayDepositByLinkController: Symbol.for('IPayDepositByLinkController'),
    IMarkEmployeeNoShowByLinkController: Symbol.for('IMarkEmployeeNoShowByLinkController'),
    IRateBookingByLinkController: Symbol.for('IRateBookingByLinkController'),
    IRescheduleBookingByLinkController: Symbol.for('IRescheduleBookingByLinkController'),
    IJoinWaitlistController: Symbol.for('IJoinWaitlistController'),
    IGetWaitlistEntryByLinkController: Symbol.for('IGetWaitlistEntryByLinkController'),
    ILeaveWaitlistController: Symbol.for('ILeaveWaitlistController'),
    IListMyAvailabilitiesController: Symbol.for('IListMyAvailabilitiesController'),
    ICreateAvailabilityController: Symbol.for('ICreateAvailabilityController'),
    IPreviewUpdateAvailabilityController: Symbol.for('IPreviewUpdateAvailabilityController'),
    IUpdateAvailabilityController: Symbol.for('IUpdateAvailabilityController'),
    IMakeAvailabilityDefaultController: Symbol.for('IMakeAvailabilityDefaultController'),
    IDeleteAvailabilityController: Symbol.for('IDeleteAvailabilityController'),
    IGetPersonalAnalyticsController: Symbol.for('IGetPersonalAnalyticsController'),
    IListAnalyticsBusinessesController: Symbol.for('IListAnalyticsBusinessesController'),
    IGetBusinessAnalyticsController: Symbol.for('IGetBusinessAnalyticsController'),
    IGetEmployeesPerPeriodController: Symbol.for('IGetEmployeesPerPeriodController'),
    IDownloadBookingsCsvController: Symbol.for('IDownloadBookingsCsvController'),
    IListMyOutOfOfficeController: Symbol.for('IListMyOutOfOfficeController'),
    ICreateOutOfOfficeController: Symbol.for('ICreateOutOfOfficeController'),
    IUpdateOutOfOfficeController: Symbol.for('IUpdateOutOfOfficeController'),
    IDeleteOutOfOfficeController: Symbol.for('IDeleteOutOfOfficeController'),
    IPreviewOutOfOfficeController: Symbol.for('IPreviewOutOfOfficeController'),
    IPreviewUpdateOutOfOfficeController: Symbol.for('IPreviewUpdateOutOfOfficeController'),
    IListHolidayCountriesController: Symbol.for('IListHolidayCountriesController'),
    IGetMyHolidaysController: Symbol.for('IGetMyHolidaysController'),
    ISetHolidayCountryController: Symbol.for('ISetHolidayCountryController'),
    IToggleHolidayController: Symbol.for('IToggleHolidayController'),
    IListHolidayConflictsController: Symbol.for('IListHolidayConflictsController'),
    IPreviewSetHolidayCountryController: Symbol.for('IPreviewSetHolidayCountryController'),
    IPreviewToggleHolidayController: Symbol.for('IPreviewToggleHolidayController'),
};

export interface DI_RETURN_TYPES {
    IInstrumentationService: IInstrumentationService;
    ICrashReporterService: ICrashReporterService;
    IAuthenticationService: IAuthenticationService;

    IBusinessesRepository: IBusinessesRepository;
    IPublicBusinessesRepository: IPublicBusinessesRepository;
    IBranchesRepository: IBranchesRepository;
    ICabinsRepository: ICabinsRepository;
    IEmployeesRepository: IEmployeesRepository;
    IBookingsRepository: IBookingsRepository;
    IUserBookingsRepository: IUserBookingsRepository;
    IClientBookingsRepository: IClientBookingsRepository;
    IWaitlistRepository: IWaitlistRepository;
    IAvailabilitiesRepository: IAvailabilitiesRepository;
    IOutOfOfficeRepository: IOutOfOfficeRepository;
    IAnalyticsRepository: IAnalyticsRepository;
    IHolidaysRepository: IHolidaysRepository;
    IServicesRepository: IServicesRepository;

    ICreateBranchUseCase: ICreateBranchUseCase;
    IUpdateBranchUseCase: IUpdateBranchUseCase;
    IListBranchesWithImagesUseCase: IListBranchesWithImagesUseCase;
    IListCabinsUseCase: IListCabinsUseCase;
    ICreateCabinUseCase: ICreateCabinUseCase;
    IRenameCabinUseCase: IRenameCabinUseCase;
    IRetireCabinUseCase: IRetireCabinUseCase;
    ICreateBusinessUseCase: ICreateBusinessUseCase;
    IListBusinessesUseCase: IListBusinessesUseCase;
    IUpdateBusinessUseCase: IUpdateBusinessUseCase;
    IUploadBusinessLogoUseCase: IUploadBusinessLogoUseCase;
    IDeleteBusinessLogoUseCase: IDeleteBusinessLogoUseCase;
    IUploadBranchImageUseCase: IUploadBranchImageUseCase;
    IDeleteBranchImageUseCase: IDeleteBranchImageUseCase;
    IReorderBranchImagesUseCase: IReorderBranchImagesUseCase;
    IGetPublicBusinessUseCase: IGetPublicBusinessUseCase;
    IGetPublicBranchUseCase: IGetPublicBranchUseCase;
    IResolveBookingLinkUseCase: IResolveBookingLinkUseCase;
    IListEmployeesUseCase: IListEmployeesUseCase;
    IAddEmployeeUseCase: IAddEmployeeUseCase;
    IListInvitationsUseCase: IListInvitationsUseCase;
    IRetireEmployeeUseCase: IRetireEmployeeUseCase;
    IListMyServicesUseCase: IListMyServicesUseCase;
    ICreateServiceUseCase: ICreateServiceUseCase;
    IGetMyServiceUseCase: IGetMyServiceUseCase;
    IUpdateServiceUseCase: IUpdateServiceUseCase;
    IRetireServiceUseCase: IRetireServiceUseCase;
    IAssignEmployeeUseCase: IAssignEmployeeUseCase;
    IRemoveEmployeeUseCase: IRemoveEmployeeUseCase;
    IChangeEmployeeAvailabilityUseCase: IChangeEmployeeAvailabilityUseCase;
    IRejectInvitationUseCase: IRejectInvitationUseCase;
    IResendInvitationUseCase: IResendInvitationUseCase;
    ICancelInvitationUseCase: ICancelInvitationUseCase;
    IAcceptInvitationUseCase: IAcceptInvitationUseCase;
    IListMyInvitationsUseCase: IListMyInvitationsUseCase;
    IListSlotsUseCase: IListSlotsUseCase;
    IListSeriesSlotsUseCase: IListSeriesSlotsUseCase;
    IBookSlotUseCase: IBookSlotUseCase;
    IRequestVerificationCodeUseCase: IRequestVerificationCodeUseCase;
    IListMyBookingsUseCase: IListMyBookingsUseCase;
    IMarkBookingNoShowUseCase: IMarkBookingNoShowUseCase;
    IGetBookingHistoryUseCase: IGetBookingHistoryUseCase;
    IUnmarkBookingNoShowUseCase: IUnmarkBookingNoShowUseCase;

    IRescheduleBookingUseCase: IRescheduleBookingUseCase;
    ICancelBookingUseCase: ICancelBookingUseCase;
    IRejectBookingUseCase: IRejectBookingUseCase;
    IAcceptBookingUseCase: IAcceptBookingUseCase;
    IGetBookingByLinkUseCase: IGetBookingByLinkUseCase;
    ICancelBookingByLinkUseCase: ICancelBookingByLinkUseCase;
    ICancelBookingSeriesByLinkUseCase: ICancelBookingSeriesByLinkUseCase;
    IPayDepositByLinkUseCase: IPayDepositByLinkUseCase;
    IMarkEmployeeNoShowByLinkUseCase: IMarkEmployeeNoShowByLinkUseCase;
    IRateBookingByLinkUseCase: IRateBookingByLinkUseCase;
    IRescheduleBookingByLinkUseCase: IRescheduleBookingByLinkUseCase;
    IJoinWaitlistUseCase: IJoinWaitlistUseCase;
    IGetWaitlistEntryByLinkUseCase: IGetWaitlistEntryByLinkUseCase;
    ILeaveWaitlistUseCase: ILeaveWaitlistUseCase;
    IListAvailabilitiesUseCase: IListAvailabilitiesUseCase;
    IGetAvailabilityUseCase: IGetAvailabilityUseCase;
    ICreateAvailabilityUseCase: ICreateAvailabilityUseCase;
    IPreviewUpdateAvailabilityUseCase: IPreviewUpdateAvailabilityUseCase;
    IUpdateAvailabilityUseCase: IUpdateAvailabilityUseCase;
    IMakeAvailabilityDefaultUseCase: IMakeAvailabilityDefaultUseCase;
    IDeleteAvailabilityUseCase: IDeleteAvailabilityUseCase;
    IGetPersonalAnalyticsUseCase: IGetPersonalAnalyticsUseCase;
    IListAnalyticsBusinessesUseCase: IListAnalyticsBusinessesUseCase;
    IGetBusinessAnalyticsUseCase: IGetBusinessAnalyticsUseCase;
    IGetEmployeesPerPeriodUseCase: IGetEmployeesPerPeriodUseCase;
    IDownloadBookingsCsvUseCase: IDownloadBookingsCsvUseCase;
    IListOutOfOfficeUseCase: IListOutOfOfficeUseCase;
    ICreateOutOfOfficeUseCase: ICreateOutOfOfficeUseCase;
    IUpdateOutOfOfficeUseCase: IUpdateOutOfOfficeUseCase;
    IDeleteOutOfOfficeUseCase: IDeleteOutOfOfficeUseCase;
    IPreviewOutOfOfficeUseCase: IPreviewOutOfOfficeUseCase;
    IPreviewUpdateOutOfOfficeUseCase: IPreviewUpdateOutOfOfficeUseCase;
    IListHolidayCountriesUseCase: IListHolidayCountriesUseCase;
    IGetMyHolidaysUseCase: IGetMyHolidaysUseCase;
    ISetHolidayCountryUseCase: ISetHolidayCountryUseCase;
    IToggleHolidayUseCase: IToggleHolidayUseCase;
    IListHolidayConflictsUseCase: IListHolidayConflictsUseCase;
    IPreviewSetHolidayCountryUseCase: IPreviewSetHolidayCountryUseCase;
    IPreviewToggleHolidayUseCase: IPreviewToggleHolidayUseCase;

    IGetCurrentUserController: IGetCurrentUserController;
    ICreateBranchController: ICreateBranchController;
    IUpdateBranchController: IUpdateBranchController;
    IListBranchesWithImagesController: IListBranchesWithImagesController;
    IListCabinsController: IListCabinsController;
    ICreateCabinController: ICreateCabinController;
    IRenameCabinController: IRenameCabinController;
    IRetireCabinController: IRetireCabinController;
    ICreateBusinessController: ICreateBusinessController;
    IGetMyBusinessController: IGetMyBusinessController;
    IUpdateBusinessController: IUpdateBusinessController;
    IUploadBusinessLogoController: IUploadBusinessLogoController;
    IDeleteBusinessLogoController: IDeleteBusinessLogoController;
    IUploadBranchImageController: IUploadBranchImageController;
    IDeleteBranchImageController: IDeleteBranchImageController;
    IReorderBranchImagesController: IReorderBranchImagesController;
    IGetPublicBusinessController: IGetPublicBusinessController;
    IGetPublicBranchController: IGetPublicBranchController;
    IResolveBookingLinkController: IResolveBookingLinkController;
    IListMyEmployeesController: IListMyEmployeesController;
    IAddEmployeeController: IAddEmployeeController;
    IRetireEmployeeController: IRetireEmployeeController;
    IListMyServicesController: IListMyServicesController;
    ICreateServiceController: ICreateServiceController;
    IGetMyServiceController: IGetMyServiceController;
    IUpdateServiceController: IUpdateServiceController;
    IRetireServiceController: IRetireServiceController;
    IAssignEmployeeController: IAssignEmployeeController;
    IRemoveEmployeeController: IRemoveEmployeeController;
    IChangeEmployeeAvailabilityController: IChangeEmployeeAvailabilityController;
    IUsersRepository: IUsersRepository;
    IGetMeUseCase: IGetMeUseCase;
    IUpdateMySlugUseCase: IUpdateMySlugUseCase;
    IGetUserPageUseCase: IGetUserPageUseCase;
    IUpdateMySlugController: IUpdateMySlugController;
    IRetireMeUseCase: IRetireMeUseCase;
    IRetireMeController: IRetireMeController;
    IUpdateMyPreferencesUseCase: IUpdateMyPreferencesUseCase;
    IUpdateMyPreferencesController: IUpdateMyPreferencesController;
    IGetMyPreferencesController: IGetMyPreferencesController;
    IGetUserPageController: IGetUserPageController;
    IListPersonalServicesUseCase: IListPersonalServicesUseCase;
    ICreatePersonalServiceUseCase: ICreatePersonalServiceUseCase;
    IListMyPersonalServicesController: IListMyPersonalServicesController;
    ICreatePersonalServiceController: ICreatePersonalServiceController;
    IRejectInvitationController: IRejectInvitationController;
    IResendInvitationController: IResendInvitationController;
    ICancelInvitationController: ICancelInvitationController;
    IAcceptInvitationController: IAcceptInvitationController;
    IListMyInvitationsController: IListMyInvitationsController;
    IListSlotsController: IListSlotsController;
    IListSeriesSlotsController: IListSeriesSlotsController;
    IBookSlotController: IBookSlotController;
    IRequestVerificationCodeController: IRequestVerificationCodeController;
    IListMyBookingsController: IListMyBookingsController;
    IMarkBookingNoShowController: IMarkBookingNoShowController;
    IGetBookingHistoryController: IGetBookingHistoryController;
    IUnmarkBookingNoShowController: IUnmarkBookingNoShowController;

    IRescheduleBookingController: IRescheduleBookingController;
    ICancelBookingController: ICancelBookingController;
    IRejectBookingController: IRejectBookingController;
    IAcceptBookingController: IAcceptBookingController;
    IGetBookingByLinkController: IGetBookingByLinkController;
    ICancelBookingByLinkController: ICancelBookingByLinkController;
    ICancelBookingSeriesByLinkController: ICancelBookingSeriesByLinkController;
    IPayDepositByLinkController: IPayDepositByLinkController;
    IMarkEmployeeNoShowByLinkController: IMarkEmployeeNoShowByLinkController;
    IRateBookingByLinkController: IRateBookingByLinkController;
    IRescheduleBookingByLinkController: IRescheduleBookingByLinkController;
    IJoinWaitlistController: IJoinWaitlistController;
    IGetWaitlistEntryByLinkController: IGetWaitlistEntryByLinkController;
    ILeaveWaitlistController: ILeaveWaitlistController;
    IListMyAvailabilitiesController: IListMyAvailabilitiesController;
    ICreateAvailabilityController: ICreateAvailabilityController;
    IPreviewUpdateAvailabilityController: IPreviewUpdateAvailabilityController;
    IUpdateAvailabilityController: IUpdateAvailabilityController;
    IMakeAvailabilityDefaultController: IMakeAvailabilityDefaultController;
    IDeleteAvailabilityController: IDeleteAvailabilityController;
    IGetPersonalAnalyticsController: IGetPersonalAnalyticsController;
    IListAnalyticsBusinessesController: IListAnalyticsBusinessesController;
    IGetBusinessAnalyticsController: IGetBusinessAnalyticsController;
    IGetEmployeesPerPeriodController: IGetEmployeesPerPeriodController;
    IDownloadBookingsCsvController: IDownloadBookingsCsvController;
    IListMyOutOfOfficeController: IListMyOutOfOfficeController;
    ICreateOutOfOfficeController: ICreateOutOfOfficeController;
    IUpdateOutOfOfficeController: IUpdateOutOfOfficeController;
    IDeleteOutOfOfficeController: IDeleteOutOfOfficeController;
    IPreviewOutOfOfficeController: IPreviewOutOfOfficeController;
    IPreviewUpdateOutOfOfficeController: IPreviewUpdateOutOfOfficeController;
    IListHolidayCountriesController: IListHolidayCountriesController;
    IGetMyHolidaysController: IGetMyHolidaysController;
    ISetHolidayCountryController: ISetHolidayCountryController;
    IToggleHolidayController: IToggleHolidayController;
    IListHolidayConflictsController: IListHolidayConflictsController;
    IPreviewSetHolidayCountryController: IPreviewSetHolidayCountryController;
    IPreviewToggleHolidayController: IPreviewToggleHolidayController;
}

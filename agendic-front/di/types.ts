import type { IBusinessesRepository } from '@/src/application/repositories/businesses.repository.interface';
import type { IPublicBusinessesRepository } from '@/src/application/repositories/public-businesses.repository.interface';
import type { IGetPublicBusinessUseCase } from '@/src/application/use-cases/businesses/get-public-business.use-case';
import type { IGetPublicBranchUseCase } from '@/src/application/use-cases/businesses/get-public-branch.use-case';
import type { IGetPublicBusinessController } from '@/src/interface-adapters/controllers/businesses/get-public-business.controller';
import type { IGetPublicBranchController } from '@/src/interface-adapters/controllers/businesses/get-public-branch.controller';
import type { IAuthenticationService } from '@/src/application/services/authentication.service.interface';
import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';
import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';
import type { IListBusinessesUseCase } from '@/src/application/use-cases/businesses/list-businesses.use-case';
import type { IGetMyBusinessController } from '@/src/interface-adapters/controllers/businesses/get-my-business.controller';
import type { ICreateBusinessUseCase } from '@/src/application/use-cases/businesses/create-business.use-case';
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
import type { IRequestVerificationCodeUseCase } from '@/src/application/use-cases/bookings/request-verification-code.use-case';
import type { IRequestVerificationCodeController } from '@/src/interface-adapters/controllers/bookings/request-verification-code.controller';
import type { IBookSlotController } from '@/src/interface-adapters/controllers/bookings/book-slot.controller';
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
import type { IUpdateMySlugController } from '@/src/interface-adapters/controllers/users/update-my-slug.controller';
import type { IGetUserPageController } from '@/src/interface-adapters/controllers/users/get-user-page.controller';
import type { IListPersonalServicesUseCase } from '@/src/application/use-cases/services/list-personal-services.use-case';
import type { ICreatePersonalServiceUseCase } from '@/src/application/use-cases/services/create-personal-service.use-case';
import type { IListMyPersonalServicesController } from '@/src/interface-adapters/controllers/services/list-my-personal-services.controller';
import type { ICreatePersonalServiceController } from '@/src/interface-adapters/controllers/services/create-personal-service.controller';
import type { IEmployeeBookingsRepository } from '@/src/application/repositories/employee-bookings.repository.interface';
import type { IListMyBookingsUseCase } from '@/src/application/use-cases/bookings/list-my-bookings.use-case';
import type { IListMyBookingsController } from '@/src/interface-adapters/controllers/bookings/list-my-bookings.controller';
import type { IMarkBookingNoShowUseCase } from '@/src/application/use-cases/bookings/mark-booking-no-show.use-case';
import type { IMarkBookingNoShowController } from '@/src/interface-adapters/controllers/bookings/mark-booking-no-show.controller';
import type { IRescheduleBookingUseCase } from '@/src/application/use-cases/bookings/reschedule-booking.use-case';
import type { IRescheduleBookingController } from '@/src/interface-adapters/controllers/bookings/reschedule-booking.controller';
import type { ICancelBookingUseCase } from '@/src/application/use-cases/bookings/cancel-booking.use-case';
import type { ICancelBookingController } from '@/src/interface-adapters/controllers/bookings/cancel-booking.controller';
import type { IRejectBookingUseCase } from '@/src/application/use-cases/bookings/reject-booking.use-case';
import type { IRejectBookingController } from '@/src/interface-adapters/controllers/bookings/reject-booking.controller';
import type { IAcceptBookingUseCase } from '@/src/application/use-cases/bookings/accept-booking.use-case';
import type { IAcceptBookingController } from '@/src/interface-adapters/controllers/bookings/accept-booking.controller';
import type { IClientBookingsRepository } from '@/src/application/repositories/client-bookings.repository.interface';
import type { IOpenClientAccessUseCase } from '@/src/application/use-cases/bookings/open-client-access.use-case';
import type { IOpenClientAccessController } from '@/src/interface-adapters/controllers/bookings/open-client-access.controller';
import type { IListClientBookingsUseCase } from '@/src/application/use-cases/bookings/list-client-bookings.use-case';
import type { IListClientBookingsController } from '@/src/interface-adapters/controllers/bookings/list-client-bookings.controller';
import type { ICancelClientBookingUseCase } from '@/src/application/use-cases/bookings/cancel-client-booking.use-case';
import type { ICancelClientBookingController } from '@/src/interface-adapters/controllers/bookings/cancel-client-booking.controller';
import type { IRescheduleClientBookingUseCase } from '@/src/application/use-cases/bookings/reschedule-client-booking.use-case';
import type { IRescheduleClientBookingController } from '@/src/interface-adapters/controllers/bookings/reschedule-client-booking.controller';
import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IListAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import type { IGetAvailabilityUseCase } from '@/src/application/use-cases/availabilities/get-availability.use-case';
import type { ICreateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/create-availability.use-case';
import type { IUpdateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/update-availability.use-case';
import type { IMakeAvailabilityDefaultUseCase } from '@/src/application/use-cases/availabilities/make-availability-default.use-case';
import type { IDeleteAvailabilityUseCase } from '@/src/application/use-cases/availabilities/delete-availability.use-case';
import type { IListMyAvailabilitiesController } from '@/src/interface-adapters/controllers/availabilities/list-my-availabilities.controller';
import type { ICreateAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/create-availability.controller';
import type { IUpdateAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/update-availability.controller';
import type { IMakeAvailabilityDefaultController } from '@/src/interface-adapters/controllers/availabilities/make-availability-default.controller';
import type { IDeleteAvailabilityController } from '@/src/interface-adapters/controllers/availabilities/delete-availability.controller';

export const DI_SYMBOLS = {
    // Services
    IInstrumentationService: Symbol.for('IInstrumentationService'),
    ICrashReporterService: Symbol.for('ICrashReporterService'),
    IAuthenticationService: Symbol.for('IAuthenticationService'),

    // Repositories
    IBusinessesRepository: Symbol.for('IBusinessesRepository'),
    IPublicBusinessesRepository: Symbol.for('IPublicBusinessesRepository'),
    IEmployeesRepository: Symbol.for('IEmployeesRepository'),
    IBookingsRepository: Symbol.for('IBookingsRepository'),
    IEmployeeBookingsRepository: Symbol.for('IEmployeeBookingsRepository'),
    IClientBookingsRepository: Symbol.for('IClientBookingsRepository'),
    IAvailabilitiesRepository: Symbol.for('IAvailabilitiesRepository'),
    IServicesRepository: Symbol.for('IServicesRepository'),

    // Use cases
    ICreateBusinessUseCase: Symbol.for('ICreateBusinessUseCase'),
    IListBusinessesUseCase: Symbol.for('IListBusinessesUseCase'),
    IUpdateBusinessUseCase: Symbol.for('IUpdateBusinessUseCase'),
    IGetPublicBusinessUseCase: Symbol.for('IGetPublicBusinessUseCase'),
    IGetPublicBranchUseCase: Symbol.for('IGetPublicBranchUseCase'),
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
    IBookSlotUseCase: Symbol.for('IBookSlotUseCase'),
    IRequestVerificationCodeUseCase: Symbol.for('IRequestVerificationCodeUseCase'),
    IListMyBookingsUseCase: Symbol.for('IListMyBookingsUseCase'),
    IMarkBookingNoShowUseCase: Symbol.for('IMarkBookingNoShowUseCase'),
    IRescheduleBookingUseCase: Symbol.for('IRescheduleBookingUseCase'),
    ICancelBookingUseCase: Symbol.for('ICancelBookingUseCase'),
    IRejectBookingUseCase: Symbol.for('IRejectBookingUseCase'),
    IAcceptBookingUseCase: Symbol.for('IAcceptBookingUseCase'),
    IOpenClientAccessUseCase: Symbol.for('IOpenClientAccessUseCase'),
    IListClientBookingsUseCase: Symbol.for('IListClientBookingsUseCase'),
    ICancelClientBookingUseCase: Symbol.for('ICancelClientBookingUseCase'),
    IRescheduleClientBookingUseCase: Symbol.for('IRescheduleClientBookingUseCase'),
    IListAvailabilitiesUseCase: Symbol.for('IListAvailabilitiesUseCase'),
    IGetAvailabilityUseCase: Symbol.for('IGetAvailabilityUseCase'),
    ICreateAvailabilityUseCase: Symbol.for('ICreateAvailabilityUseCase'),
    IUpdateAvailabilityUseCase: Symbol.for('IUpdateAvailabilityUseCase'),
    IMakeAvailabilityDefaultUseCase: Symbol.for('IMakeAvailabilityDefaultUseCase'),
    IDeleteAvailabilityUseCase: Symbol.for('IDeleteAvailabilityUseCase'),

    // Controllers
    IGetCurrentUserController: Symbol.for('IGetCurrentUserController'),
    ICreateBusinessController: Symbol.for('ICreateBusinessController'),
    IGetMyBusinessController: Symbol.for('IGetMyBusinessController'),
    IUpdateBusinessController: Symbol.for('IUpdateBusinessController'),
    IGetPublicBusinessController: Symbol.for('IGetPublicBusinessController'),
    IGetPublicBranchController: Symbol.for('IGetPublicBranchController'),
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
    IBookSlotController: Symbol.for('IBookSlotController'),
    IRequestVerificationCodeController: Symbol.for('IRequestVerificationCodeController'),
    IListMyBookingsController: Symbol.for('IListMyBookingsController'),
    IMarkBookingNoShowController: Symbol.for('IMarkBookingNoShowController'),
    IRescheduleBookingController: Symbol.for('IRescheduleBookingController'),
    ICancelBookingController: Symbol.for('ICancelBookingController'),
    IRejectBookingController: Symbol.for('IRejectBookingController'),
    IAcceptBookingController: Symbol.for('IAcceptBookingController'),
    IOpenClientAccessController: Symbol.for('IOpenClientAccessController'),
    IListClientBookingsController: Symbol.for('IListClientBookingsController'),
    ICancelClientBookingController: Symbol.for('ICancelClientBookingController'),
    IRescheduleClientBookingController: Symbol.for('IRescheduleClientBookingController'),
    IListMyAvailabilitiesController: Symbol.for('IListMyAvailabilitiesController'),
    ICreateAvailabilityController: Symbol.for('ICreateAvailabilityController'),
    IUpdateAvailabilityController: Symbol.for('IUpdateAvailabilityController'),
    IMakeAvailabilityDefaultController: Symbol.for('IMakeAvailabilityDefaultController'),
    IDeleteAvailabilityController: Symbol.for('IDeleteAvailabilityController'),
};

export interface DI_RETURN_TYPES {
    // Services
    IInstrumentationService: IInstrumentationService;
    ICrashReporterService: ICrashReporterService;
    IAuthenticationService: IAuthenticationService;

    // Repositories
    IBusinessesRepository: IBusinessesRepository;
    IPublicBusinessesRepository: IPublicBusinessesRepository;
    IEmployeesRepository: IEmployeesRepository;
    IBookingsRepository: IBookingsRepository;
    IEmployeeBookingsRepository: IEmployeeBookingsRepository;
    IClientBookingsRepository: IClientBookingsRepository;
    IAvailabilitiesRepository: IAvailabilitiesRepository;
    IServicesRepository: IServicesRepository;

    // Use cases
    ICreateBusinessUseCase: ICreateBusinessUseCase;
    IListBusinessesUseCase: IListBusinessesUseCase;
    IUpdateBusinessUseCase: IUpdateBusinessUseCase;
    IGetPublicBusinessUseCase: IGetPublicBusinessUseCase;
    IGetPublicBranchUseCase: IGetPublicBranchUseCase;
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
    IBookSlotUseCase: IBookSlotUseCase;
    IRequestVerificationCodeUseCase: IRequestVerificationCodeUseCase;
    IListMyBookingsUseCase: IListMyBookingsUseCase;
    IMarkBookingNoShowUseCase: IMarkBookingNoShowUseCase;
    IRescheduleBookingUseCase: IRescheduleBookingUseCase;
    ICancelBookingUseCase: ICancelBookingUseCase;
    IRejectBookingUseCase: IRejectBookingUseCase;
    IAcceptBookingUseCase: IAcceptBookingUseCase;
    IOpenClientAccessUseCase: IOpenClientAccessUseCase;
    IListClientBookingsUseCase: IListClientBookingsUseCase;
    ICancelClientBookingUseCase: ICancelClientBookingUseCase;
    IRescheduleClientBookingUseCase: IRescheduleClientBookingUseCase;
    IListAvailabilitiesUseCase: IListAvailabilitiesUseCase;
    IGetAvailabilityUseCase: IGetAvailabilityUseCase;
    ICreateAvailabilityUseCase: ICreateAvailabilityUseCase;
    IUpdateAvailabilityUseCase: IUpdateAvailabilityUseCase;
    IMakeAvailabilityDefaultUseCase: IMakeAvailabilityDefaultUseCase;
    IDeleteAvailabilityUseCase: IDeleteAvailabilityUseCase;

    // Controllers
    IGetCurrentUserController: IGetCurrentUserController;
    ICreateBusinessController: ICreateBusinessController;
    IGetMyBusinessController: IGetMyBusinessController;
    IUpdateBusinessController: IUpdateBusinessController;
    IGetPublicBusinessController: IGetPublicBusinessController;
    IGetPublicBranchController: IGetPublicBranchController;
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
    IBookSlotController: IBookSlotController;
    IRequestVerificationCodeController: IRequestVerificationCodeController;
    IListMyBookingsController: IListMyBookingsController;
    IMarkBookingNoShowController: IMarkBookingNoShowController;
    IRescheduleBookingController: IRescheduleBookingController;
    ICancelBookingController: ICancelBookingController;
    IRejectBookingController: IRejectBookingController;
    IAcceptBookingController: IAcceptBookingController;
    IOpenClientAccessController: IOpenClientAccessController;
    IListClientBookingsController: IListClientBookingsController;
    ICancelClientBookingController: ICancelClientBookingController;
    IRescheduleClientBookingController: IRescheduleClientBookingController;
    IListMyAvailabilitiesController: IListMyAvailabilitiesController;
    ICreateAvailabilityController: ICreateAvailabilityController;
    IUpdateAvailabilityController: IUpdateAvailabilityController;
    IMakeAvailabilityDefaultController: IMakeAvailabilityDefaultController;
    IDeleteAvailabilityController: IDeleteAvailabilityController;
}

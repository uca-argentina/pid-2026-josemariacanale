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
import type { IBookSlotController } from '@/src/interface-adapters/controllers/bookings/book-slot.controller';
import type { IRetireEmployeeController } from '@/src/interface-adapters/controllers/employees/retire-employee.controller';
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
import type { IAvailabilitiesRepository } from '@/src/application/repositories/availabilities.repository.interface';
import type { IOverridesRepository } from '@/src/application/repositories/overrides.repository.interface';
import type { IListOverridesUseCase } from '@/src/application/use-cases/overrides/list-overrides.use-case';
import type { ISetOverrideUseCase } from '@/src/application/use-cases/overrides/set-override.use-case';
import type { IRemoveOverrideUseCase } from '@/src/application/use-cases/overrides/remove-override.use-case';
import type { ISetOverridesController } from '@/src/interface-adapters/controllers/overrides/set-overrides.controller';
import type { IRemoveOverrideController } from '@/src/interface-adapters/controllers/overrides/remove-override.controller';
import type { IListAvailabilitiesUseCase } from '@/src/application/use-cases/availabilities/list-availabilities.use-case';
import type { ICreateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/create-availability.use-case';
import type { IUpdateAvailabilityUseCase } from '@/src/application/use-cases/availabilities/update-availability.use-case';
import type { IMakeAvailabilityDefaultUseCase } from '@/src/application/use-cases/availabilities/make-availability-default.use-case';
import type { IDeleteAvailabilityUseCase } from '@/src/application/use-cases/availabilities/delete-availability.use-case';
import type { IListStaffAvailabilitiesController } from '@/src/interface-adapters/controllers/availabilities/list-staff-availabilities.controller';
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
    IAvailabilitiesRepository: Symbol.for('IAvailabilitiesRepository'),
    IOverridesRepository: Symbol.for('IOverridesRepository'),

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
    IRejectInvitationUseCase: Symbol.for('IRejectInvitationUseCase'),
    IResendInvitationUseCase: Symbol.for('IResendInvitationUseCase'),
    ICancelInvitationUseCase: Symbol.for('ICancelInvitationUseCase'),
    IAcceptInvitationUseCase: Symbol.for('IAcceptInvitationUseCase'),
    IListMyInvitationsUseCase: Symbol.for('IListMyInvitationsUseCase'),
    IListSlotsUseCase: Symbol.for('IListSlotsUseCase'),
    IBookSlotUseCase: Symbol.for('IBookSlotUseCase'),
    IListMyBookingsUseCase: Symbol.for('IListMyBookingsUseCase'),
    IMarkBookingNoShowUseCase: Symbol.for('IMarkBookingNoShowUseCase'),
    IRescheduleBookingUseCase: Symbol.for('IRescheduleBookingUseCase'),
    ICancelBookingUseCase: Symbol.for('ICancelBookingUseCase'),
    IRejectBookingUseCase: Symbol.for('IRejectBookingUseCase'),
    IAcceptBookingUseCase: Symbol.for('IAcceptBookingUseCase'),
    IListAvailabilitiesUseCase: Symbol.for('IListAvailabilitiesUseCase'),
    ICreateAvailabilityUseCase: Symbol.for('ICreateAvailabilityUseCase'),
    IUpdateAvailabilityUseCase: Symbol.for('IUpdateAvailabilityUseCase'),
    IMakeAvailabilityDefaultUseCase: Symbol.for('IMakeAvailabilityDefaultUseCase'),
    IDeleteAvailabilityUseCase: Symbol.for('IDeleteAvailabilityUseCase'),
    IListOverridesUseCase: Symbol.for('IListOverridesUseCase'),
    ISetOverrideUseCase: Symbol.for('ISetOverrideUseCase'),
    IRemoveOverrideUseCase: Symbol.for('IRemoveOverrideUseCase'),

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
    IRejectInvitationController: Symbol.for('IRejectInvitationController'),
    IResendInvitationController: Symbol.for('IResendInvitationController'),
    ICancelInvitationController: Symbol.for('ICancelInvitationController'),
    IAcceptInvitationController: Symbol.for('IAcceptInvitationController'),
    IListMyInvitationsController: Symbol.for('IListMyInvitationsController'),
    IListSlotsController: Symbol.for('IListSlotsController'),
    IBookSlotController: Symbol.for('IBookSlotController'),
    IListMyBookingsController: Symbol.for('IListMyBookingsController'),
    IMarkBookingNoShowController: Symbol.for('IMarkBookingNoShowController'),
    IRescheduleBookingController: Symbol.for('IRescheduleBookingController'),
    ICancelBookingController: Symbol.for('ICancelBookingController'),
    IRejectBookingController: Symbol.for('IRejectBookingController'),
    IAcceptBookingController: Symbol.for('IAcceptBookingController'),
    IListStaffAvailabilitiesController: Symbol.for('IListStaffAvailabilitiesController'),
    ICreateAvailabilityController: Symbol.for('ICreateAvailabilityController'),
    IUpdateAvailabilityController: Symbol.for('IUpdateAvailabilityController'),
    IMakeAvailabilityDefaultController: Symbol.for('IMakeAvailabilityDefaultController'),
    IDeleteAvailabilityController: Symbol.for('IDeleteAvailabilityController'),
    ISetOverridesController: Symbol.for('ISetOverridesController'),
    IRemoveOverrideController: Symbol.for('IRemoveOverrideController'),
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
    IAvailabilitiesRepository: IAvailabilitiesRepository;
    IOverridesRepository: IOverridesRepository;

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
    IRejectInvitationUseCase: IRejectInvitationUseCase;
    IResendInvitationUseCase: IResendInvitationUseCase;
    ICancelInvitationUseCase: ICancelInvitationUseCase;
    IAcceptInvitationUseCase: IAcceptInvitationUseCase;
    IListMyInvitationsUseCase: IListMyInvitationsUseCase;
    IListSlotsUseCase: IListSlotsUseCase;
    IBookSlotUseCase: IBookSlotUseCase;
    IListMyBookingsUseCase: IListMyBookingsUseCase;
    IMarkBookingNoShowUseCase: IMarkBookingNoShowUseCase;
    IRescheduleBookingUseCase: IRescheduleBookingUseCase;
    ICancelBookingUseCase: ICancelBookingUseCase;
    IRejectBookingUseCase: IRejectBookingUseCase;
    IAcceptBookingUseCase: IAcceptBookingUseCase;
    IListAvailabilitiesUseCase: IListAvailabilitiesUseCase;
    ICreateAvailabilityUseCase: ICreateAvailabilityUseCase;
    IUpdateAvailabilityUseCase: IUpdateAvailabilityUseCase;
    IMakeAvailabilityDefaultUseCase: IMakeAvailabilityDefaultUseCase;
    IDeleteAvailabilityUseCase: IDeleteAvailabilityUseCase;
    IListOverridesUseCase: IListOverridesUseCase;
    ISetOverrideUseCase: ISetOverrideUseCase;
    IRemoveOverrideUseCase: IRemoveOverrideUseCase;

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
    IRejectInvitationController: IRejectInvitationController;
    IResendInvitationController: IResendInvitationController;
    ICancelInvitationController: ICancelInvitationController;
    IAcceptInvitationController: IAcceptInvitationController;
    IListMyInvitationsController: IListMyInvitationsController;
    IListSlotsController: IListSlotsController;
    IBookSlotController: IBookSlotController;
    IListMyBookingsController: IListMyBookingsController;
    IMarkBookingNoShowController: IMarkBookingNoShowController;
    IRescheduleBookingController: IRescheduleBookingController;
    ICancelBookingController: ICancelBookingController;
    IRejectBookingController: IRejectBookingController;
    IAcceptBookingController: IAcceptBookingController;
    IListStaffAvailabilitiesController: IListStaffAvailabilitiesController;
    ICreateAvailabilityController: ICreateAvailabilityController;
    IUpdateAvailabilityController: IUpdateAvailabilityController;
    IMakeAvailabilityDefaultController: IMakeAvailabilityDefaultController;
    IDeleteAvailabilityController: IDeleteAvailabilityController;
    ISetOverridesController: ISetOverridesController;
    IRemoveOverrideController: IRemoveOverrideController;
}

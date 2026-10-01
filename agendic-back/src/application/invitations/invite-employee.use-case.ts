import { Inject, Injectable } from '@nestjs/common';
import {
  BUSINESSES_REPOSITORY,
  BusinessesRepository,
} from '../../domain/businesses/businesses.repository';
import { CLOCK, Clock } from '../../domain/clock';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError } from '../../domain/errors';
import {
  Invitation,
  INVITATION_TTL_DAYS,
} from '../../domain/invitations/invitation';
import {
  INVITATIONS_REPOSITORY,
  InvitationsRepository,
} from '../../domain/invitations/invitations.repository';
import { CLERK_AUTH, ClerkAuth } from '../../domain/users/clerk-auth';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';
import { assertOwner } from '../businesses/assert-owner';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Invita a un email a ser Empleado del Negocio (ADR 0019).
 *
 * Si ningún Usuario tiene ese email, Clerk le manda el mail para crearse una cuenta; la Invitación se crea
 * recién después, así que si Clerk falla no queda nada. Invitar de nuevo a un email ya pendiente devuelve la
 * misma Invitación (`created: false`) y reenvía el mail si corresponde.
 *
 * @throws {NotFoundError} el Negocio no existe
 * @throws {ForbiddenError} no es el Dueño
 * @throws {BusinessRuleError} el email ya es de un Empleado activo del Negocio
 * @throws {ExternalServiceError} Clerk falló
 */
@Injectable()
export class InviteEmployeeUseCase {
  constructor(
    @Inject(BUSINESSES_REPOSITORY)
    private readonly businesses: BusinessesRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(INVITATIONS_REPOSITORY)
    private readonly invitations: InvitationsRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(CLERK_AUTH) private readonly clerk: ClerkAuth,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(
    userId: number,
    businessId: number,
    email: string,
  ): Promise<{ invitation: Invitation; created: boolean }> {
    assertOwner(await this.businesses.findById(businessId), userId);
    const staff = await this.employees.listActiveByBusiness(businessId);
    if (staff.some((employee) => employee.email.toLowerCase() === email))
      throw new BusinessRuleError('Esa persona ya es Empleado del Negocio.');
    const now = this.clock.now();
    const pending = await this.invitations.findPending(businessId, email, now);
    if (!(await this.users.findByEmail(email)))
      await this.clerk.inviteByEmail(email);
    if (pending) return { invitation: pending, created: false };
    const invitation = await this.invitations.create({
      businessId,
      email,
      expiresAt: new Date(now.getTime() + INVITATION_TTL_DAYS * DAY_MS),
    });
    return { invitation, created: true };
  }
}

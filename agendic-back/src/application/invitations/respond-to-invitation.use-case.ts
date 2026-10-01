import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_AVAILABILITY } from '../../domain/availabilities/availability';
import { CLOCK, Clock } from '../../domain/clock';
import { Employee } from '../../domain/employees/employee';
import {
  EMPLOYEES_REPOSITORY,
  EmployeesRepository,
} from '../../domain/employees/employees.repository';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import {
  INVITATIONS_REPOSITORY,
  InvitationsRepository,
} from '../../domain/invitations/invitations.repository';
import {
  USERS_REPOSITORY,
  UsersRepository,
} from '../../domain/users/users.repository';

/**
 * Acepta o rechaza una Invitación dirigida al email del Usuario (ADR 0019).
 *
 * Aceptar crea el Empleado con la Availability predeterminada y cierra la Invitación; rechazar solo la cierra.
 *
 * @throws {NotFoundError} la Invitación no existe o no es del email del Usuario
 * @throws {BusinessRuleError} la Invitación venció, o el Usuario ya es Empleado del Negocio
 */
@Injectable()
export class RespondToInvitationUseCase {
  constructor(
    @Inject(INVITATIONS_REPOSITORY)
    private readonly invitations: InvitationsRepository,
    @Inject(EMPLOYEES_REPOSITORY)
    private readonly employees: EmployeesRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @returns el Empleado recién creado
   * @throws {NotFoundError} la Invitación no existe o no es del Usuario
   * @throws {BusinessRuleError} venció, ya fue respondida o el Usuario ya es Empleado del Negocio
   */
  async accept(userId: number, invitationId: number): Promise<Employee> {
    const invitation = await this.load(userId, invitationId);
    const active = await this.employees.listActiveByUser(userId);
    if (
      active.some((employee) => employee.businessId === invitation.businessId)
    )
      throw new BusinessRuleError('Ya sos Empleado del Negocio.');
    if (invitation.closedAt)
      throw new BusinessRuleError('La invitación ya fue respondida.');
    const employee = await this.employees.create({
      userId,
      businessId: invitation.businessId,
      availability: DEFAULT_AVAILABILITY,
    });
    await this.invitations.close(invitation.id, this.clock.now());
    return employee;
  }

  /**
   * @throws {NotFoundError} la Invitación no existe o no es del Usuario
   * @throws {BusinessRuleError} venció o ya fue respondida
   */
  async reject(userId: number, invitationId: number): Promise<void> {
    const invitation = await this.load(userId, invitationId);
    if (invitation.closedAt)
      throw new BusinessRuleError('La invitación ya fue respondida.');
    await this.invitations.close(invitation.id, this.clock.now());
  }

  private async load(userId: number, invitationId: number) {
    const user = await this.users.findById(userId);
    const invitation = await this.invitations.findById(invitationId);
    if (!user || !invitation || invitation.email !== user.email.toLowerCase())
      throw new NotFoundError('La invitación no existe.');
    if (invitation.expiresAt <= this.clock.now())
      throw new BusinessRuleError('La invitación venció');
    return invitation;
  }
}

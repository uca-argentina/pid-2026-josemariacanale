import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import { acceptInvitationUseCase } from '@/src/application/use-cases/employees/accept-invitation.use-case';
import { listMyInvitationsUseCase } from '@/src/application/use-cases/employees/list-my-invitations.use-case';
import { rejectInvitationUseCase } from '@/src/application/use-cases/employees/reject-invitation.use-case';
import { instrumentation } from '@/tests/unit/stubs';

const repoWith = (overrides: Partial<IEmployeesRepository>): IEmployeesRepository => ({
    listEmployees: jest.fn(),
    addEmployee: jest.fn(),
    listInvitations: jest.fn(),
    retireEmployee: jest.fn(),
    listMyInvitations: jest.fn(),
    acceptInvitation: jest.fn(),
    rejectInvitation: jest.fn(),
    ...overrides,
});

describe('Invitaciones del Usuario use cases', () => {
    it('lists the pending Invitaciones of the Usuario through the repository', async () => {
        const invitation = { id: 1, business: { name: 'Estudio Norte', slug: 'estudio-norte' } };
        const listMyInvitations = jest.fn().mockResolvedValue([invitation]);

        await expect(listMyInvitationsUseCase(instrumentation, repoWith({ listMyInvitations }))()).resolves.toEqual([invitation]);
    });

    it('accepts an Invitación through the repository', async () => {
        const acceptInvitation = jest.fn().mockResolvedValue(undefined);

        await acceptInvitationUseCase(instrumentation, repoWith({ acceptInvitation }))(4);
        expect(acceptInvitation).toHaveBeenCalledWith(4);
    });

    it('rejects an Invitación through the repository', async () => {
        const rejectInvitation = jest.fn().mockResolvedValue(undefined);

        await rejectInvitationUseCase(instrumentation, repoWith({ rejectInvitation }))(4);
        expect(rejectInvitation).toHaveBeenCalledWith(4);
    });
});

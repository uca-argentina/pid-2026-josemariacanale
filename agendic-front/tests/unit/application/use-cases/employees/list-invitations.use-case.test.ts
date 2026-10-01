import type { IEmployeesRepository } from '@/src/application/repositories/employees.repository.interface';
import { listInvitationsUseCase } from '@/src/application/use-cases/employees/list-invitations.use-case';
import { instrumentation } from '@/tests/unit/stubs';

const invitation = { id: 5, email: 'martina@estudio.com', expiresAt: '2026-10-08T00:00:00.000Z' };
const repoWith = (listInvitations: jest.Mock): IEmployeesRepository => ({
    listEmployees: jest.fn(),
    addEmployee: jest.fn(),
    listInvitations,
    retireEmployee: jest.fn(),
});

describe('listInvitationsUseCase', () => {
    it('lists the pending Invitaciones of the Negocio through the repository', async () => {
        const listInvitations = jest.fn().mockResolvedValue([invitation]);

        await expect(listInvitationsUseCase(instrumentation, repoWith(listInvitations))(1)).resolves.toEqual([invitation]);
        expect(listInvitations).toHaveBeenCalledWith(1);
    });
});

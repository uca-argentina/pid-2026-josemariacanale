import type { IStreakProgramsRepository } from '@/src/application/repositories/streak-programs.repository.interface';
import { createStreakRewardUseCase } from '@/src/application/use-cases/streaks/create-streak-reward.use-case';
import { deleteStreakRewardUseCase } from '@/src/application/use-cases/streaks/delete-streak-reward.use-case';
import { getStreakProgramUseCase } from '@/src/application/use-cases/streaks/get-streak-program.use-case';
import { saveStreakProgramUseCase } from '@/src/application/use-cases/streaks/save-streak-program.use-case';
import { updateStreakRewardUseCase } from '@/src/application/use-cases/streaks/update-streak-reward.use-case';
import { UnauthorizedError } from '@/src/entities/errors/auth';
import { NotFoundError } from '@/src/entities/errors/common';
import { FreeServiceNotAllowedError } from '@/src/entities/errors/streak';
import type { CreateStreakReward, StreakReward } from '@/src/entities/models/streak-program';
import { instrumentation } from '@/tests/unit/stubs';

const reward: StreakReward = {
    id: 7,
    requiredCount: 5,
    repeatable: false,
    type: 'PERCENT_DISCOUNT',
    value: 10,
    description: null,
    service: null,
    validForDays: null,
};
const program = { active: true, burnAfterDays: 30, rewards: [reward] };
const fields: CreateStreakReward = { requiredCount: 5, repeatable: false, type: 'PERCENT_DISCOUNT', value: 10, validForDays: null };
const repoWith = (stubs: Partial<IStreakProgramsRepository>): IStreakProgramsRepository => ({
    getProgram: jest.fn(),
    saveProgram: jest.fn(),
    createReward: jest.fn(),
    updateReward: jest.fn(),
    deleteReward: jest.fn(),
    ...stubs,
});

describe('getStreakProgramUseCase', () => {
    it('reads the program of the scope it is asked for', async () => {
        const getProgram = jest.fn().mockResolvedValue(program);

        await expect(getStreakProgramUseCase(instrumentation, repoWith({ getProgram }))({ businessId: 3 })).resolves.toEqual(program);
        expect(getProgram).toHaveBeenCalledWith({ businessId: 3 });
    });

    it('lets UnauthorizedError through', async () => {
        const repo = repoWith({ getProgram: jest.fn().mockRejectedValue(new UnauthorizedError('x')) });

        await expect(getStreakProgramUseCase(instrumentation, repo)({ businessId: 3 })).rejects.toBeInstanceOf(UnauthorizedError);
    });
});

describe('saveStreakProgramUseCase', () => {
    it('saves through the repository', async () => {
        const saveProgram = jest.fn().mockResolvedValue(program);
        const input = { active: true, burnAfterDays: 30 };

        await expect(saveStreakProgramUseCase(instrumentation, repoWith({ saveProgram }))(input)).resolves.toEqual(program);
        expect(saveProgram).toHaveBeenCalledWith(input);
    });

    it('lets NotFoundError through', async () => {
        const repo = repoWith({ saveProgram: jest.fn().mockRejectedValue(new NotFoundError('x')) });

        await expect(saveStreakProgramUseCase(instrumentation, repo)({ businessId: 3, active: true, burnAfterDays: 30 })).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('createStreakRewardUseCase', () => {
    it('creates through the repository', async () => {
        const createReward = jest.fn().mockResolvedValue(reward);

        await expect(createStreakRewardUseCase(instrumentation, repoWith({ createReward }))(fields)).resolves.toEqual(reward);
        expect(createReward).toHaveBeenCalledWith(fields);
    });

    it('lets FreeServiceNotAllowedError through', async () => {
        const repo = repoWith({ createReward: jest.fn().mockRejectedValue(new FreeServiceNotAllowedError('x')) });

        await expect(createStreakRewardUseCase(instrumentation, repo)(fields)).rejects.toBeInstanceOf(FreeServiceNotAllowedError);
    });
});

describe('updateStreakRewardUseCase', () => {
    it('updates through the repository', async () => {
        const updateReward = jest.fn().mockResolvedValue(reward);
        const input = { ...fields, id: 7 };

        await expect(updateStreakRewardUseCase(instrumentation, repoWith({ updateReward }))(input)).resolves.toEqual(reward);
        expect(updateReward).toHaveBeenCalledWith(input);
    });

    it('lets NotFoundError through', async () => {
        const repo = repoWith({ updateReward: jest.fn().mockRejectedValue(new NotFoundError('x')) });

        await expect(updateStreakRewardUseCase(instrumentation, repo)({ ...fields, id: 7 })).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('deleteStreakRewardUseCase', () => {
    it('deletes through the repository', async () => {
        const deleteReward = jest.fn().mockResolvedValue(undefined);

        await expect(deleteStreakRewardUseCase(instrumentation, repoWith({ deleteReward }))(7)).resolves.toBeUndefined();
        expect(deleteReward).toHaveBeenCalledWith(7);
    });

    it('lets NotFoundError through', async () => {
        const repo = repoWith({ deleteReward: jest.fn().mockRejectedValue(new NotFoundError('x')) });

        await expect(deleteStreakRewardUseCase(instrumentation, repo)(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});

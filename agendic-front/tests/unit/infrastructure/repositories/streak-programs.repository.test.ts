import { UnauthorizedError } from '@/src/entities/errors/auth';
import { ApiRequestError, InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { FreeServiceNotAllowedError } from '@/src/entities/errors/streak';
import type { CreateStreakReward } from '@/src/entities/models/streak-program';
import { StreakProgramsRepository } from '@/src/infrastructure/repositories/streak-programs.repository';
import { authWith, instrumentation } from '@/tests/unit/stubs';

const reward = {
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
const repo = () => new StreakProgramsRepository(authWith({ getAccessToken: jest.fn().mockResolvedValue('tok') }), instrumentation, 'http://api');
const respond = (status: number, body?: unknown) =>
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body), { status }));

afterEach(() => jest.restoreAllMocks());

describe('StreakProgramsRepository.getProgram', () => {
    it('GETs the program of the Negocio with the bearer token', async () => {
        const fetchSpy = respond(200, program);

        await expect(repo().getProgram({ businessId: 3 })).resolves.toEqual(program);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/businesses/3/streak-program',
            expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
        );
    });

    it('GETs the personal program without a businessId', async () => {
        const fetchSpy = respond(200, { active: false, burnAfterDays: null, rewards: [] });

        await expect(repo().getProgram({})).resolves.toEqual({ active: false, burnAfterDays: null, rewards: [] });
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/streak-program', expect.anything());
    });

    it('translates 403 and 404', async () => {
        respond(403, { message: 'Only the Dueño of Business 3 can change its Rachas' });
        await expect(repo().getProgram({ businessId: 3 })).rejects.toBeInstanceOf(UnauthorizedError);
        jest.restoreAllMocks();
        respond(404, { message: 'Business not found' });
        await expect(repo().getProgram({ businessId: 3 })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects a body that is not a program', async () => {
        respond(200, { active: 'yes' });
        await expect(repo().getProgram({})).rejects.toBeInstanceOf(ApiRequestError);
    });
});

describe('StreakProgramsRepository.saveProgram', () => {
    it('PUTs active and Tiempo de quemada, without the businessId in the body', async () => {
        const fetchSpy = respond(200, program);

        await expect(repo().saveProgram({ businessId: 3, active: true, burnAfterDays: 30 })).resolves.toEqual(program);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/businesses/3/streak-program',
            expect.objectContaining({ method: 'PUT', body: JSON.stringify({ active: true, burnAfterDays: 30 }) }),
        );
    });

    it('PUTs the personal program without a businessId', async () => {
        const fetchSpy = respond(200, program);

        await repo().saveProgram({ active: false, burnAfterDays: 7 });
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/streak-program', expect.objectContaining({ method: 'PUT' }));
    });

    it('translates 400 to InputParseError', async () => {
        respond(400, { message: ['burnAfterDays must not be greater than 365'] });
        await expect(repo().saveProgram({ active: true, burnAfterDays: 30 })).rejects.toBeInstanceOf(InputParseError);
    });
});

describe('StreakProgramsRepository.createReward', () => {
    it('POSTs the Recompensa of the Negocio, without the businessId in the body', async () => {
        const fetchSpy = respond(201, reward);

        await expect(repo().createReward({ ...fields, businessId: 3 })).resolves.toEqual(reward);
        expect(fetchSpy).toHaveBeenCalledWith(
            'http://api/businesses/3/streak-rewards',
            expect.objectContaining({ method: 'POST', body: JSON.stringify(fields) }),
        );
    });

    it('POSTs the personal Recompensa without a businessId', async () => {
        const fetchSpy = respond(201, reward);

        await repo().createReward(fields);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/users/me/streak-rewards', expect.objectContaining({ method: 'POST' }));
    });

    it('translates 422 to FreeServiceNotAllowedError', async () => {
        respond(422, { message: 'Service 9 cannot be a free Service for this program' });
        await expect(repo().createReward({ requiredCount: 5, repeatable: false, type: 'FREE_SERVICE', serviceId: 9, validForDays: null })).rejects.toBeInstanceOf(FreeServiceNotAllowedError);
    });

    it('translates 400 and 403', async () => {
        respond(400, { message: 'A PERCENT_DISCOUNT needs a value between 1 and 100, got 0' });
        await expect(repo().createReward(fields)).rejects.toBeInstanceOf(InputParseError);
        jest.restoreAllMocks();
        respond(403, { message: 'Only the Dueño of Business 3 can change its Rachas' });
        await expect(repo().createReward({ ...fields, businessId: 3 })).rejects.toBeInstanceOf(UnauthorizedError);
    });
});

describe('StreakProgramsRepository.updateReward', () => {
    it('PATCHes the whole Recompensa, without the id in the body', async () => {
        const fetchSpy = respond(200, reward);

        await expect(repo().updateReward({ ...fields, id: 7 })).resolves.toEqual(reward);
        expect(fetchSpy).toHaveBeenCalledWith('http://api/streak-rewards/7', expect.objectContaining({ method: 'PATCH', body: JSON.stringify(fields) }));
    });

    it('translates 404 and 422', async () => {
        respond(404, { message: 'Streak reward 7 not found' });
        await expect(repo().updateReward({ ...fields, id: 7 })).rejects.toBeInstanceOf(NotFoundError);
        jest.restoreAllMocks();
        respond(422, { message: 'Service 9 cannot be a free Service for this program' });
        await expect(repo().updateReward({ ...fields, id: 7 })).rejects.toBeInstanceOf(FreeServiceNotAllowedError);
    });
});

describe('StreakProgramsRepository.deleteReward', () => {
    it('DELETEs the Recompensa', async () => {
        const fetchSpy = respond(204);

        await expect(repo().deleteReward(7)).resolves.toBeUndefined();
        expect(fetchSpy).toHaveBeenCalledWith('http://api/streak-rewards/7', expect.objectContaining({ method: 'DELETE' }));
    });

    it('translates 403 and 404', async () => {
        respond(403, { message: 'Only the Dueño of Business 3 can change its Rachas' });
        await expect(repo().deleteReward(7)).rejects.toBeInstanceOf(UnauthorizedError);
        jest.restoreAllMocks();
        respond(404, { message: 'Streak reward 7 not found' });
        await expect(repo().deleteReward(7)).rejects.toBeInstanceOf(NotFoundError);
    });
});

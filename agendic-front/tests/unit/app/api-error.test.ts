import { isUserDeactivated } from '@/app/api-error';
import { ApiRequestError } from '@/src/entities/errors/common';

describe('isUserDeactivated', () => {
    it('recognizes the 403 of a Usuario dado de baja', () => {
        expect(isUserDeactivated(new ApiRequestError('User 7 is dado de baja', { status: 403 }))).toBe(true);
    });

    it.each([
        ['another 403', new ApiRequestError('Forbidden', { status: 403 })],
        ['another status', new ApiRequestError('User 7 is dado de baja', { status: 500 })],
        ['a bare Error', new Error('User 7 is dado de baja')],
    ])('ignores %s', (_case, error) => {
        expect(isUserDeactivated(error)).toBe(false);
    });
});

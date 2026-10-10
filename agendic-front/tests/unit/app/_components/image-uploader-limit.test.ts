import { takeUpToLimit } from '@/app/_components/image-uploader/limit';

describe('takeUpToLimit', () => {
    it('takes every file when they all fit', () => {
        expect(takeUpToLimit(['a', 'b'], 5, 3)).toEqual({ accepted: ['a', 'b'], dropped: 0 });
    });

    it('takes the first ones and counts the rest as dropped', () => {
        expect(takeUpToLimit(['a', 'b', 'c', 'd'], 5, 3)).toEqual({ accepted: ['a', 'b'], dropped: 2 });
    });

    it('takes none at the limit', () => {
        expect(takeUpToLimit(['a'], 1, 1)).toEqual({ accepted: [], dropped: 1 });
    });
});

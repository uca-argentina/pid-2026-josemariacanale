import { galleryLayout } from '@/app/[slug]/_components/gallery-layout';

describe('galleryLayout', () => {
    describe('mosaic', () => {
        it('repeats the only image beside the cover', () => {
            expect(galleryLayout(1).mosaic).toEqual({ cover: 0, side: [0] });
        });

        it('puts the second image beside the cover, at full height', () => {
            expect(galleryLayout(2).mosaic).toEqual({ cover: 0, side: [1] });
        });

        it('stacks the second and third images beside the cover', () => {
            expect(galleryLayout(3).mosaic).toEqual({ cover: 0, side: [1, 2] });
        });

        it('shows only the first three of six', () => {
            expect(galleryLayout(6).mosaic).toEqual({ cover: 0, side: [1, 2] });
        });
    });

    describe('showAll', () => {
        it('is hidden with a single image', () => {
            expect(galleryLayout(1).showAll).toBe(false);
        });

        it('is shown with two images', () => {
            expect(galleryLayout(2).showAll).toBe(true);
        });
    });

    describe('modalRows', () => {
        it.each([
            [1, [1]],
            [2, [2]],
            [3, [1, 2]],
            [4, [1, 2, 1]],
            [5, [1, 2, 2]],
            [6, [1, 2, 1, 2]],
            [8, [1, 2, 1, 2, 2]],
        ])('alternates full and half rows for %i images, never leaving one alone in a half row', (count, rows) => {
            expect(galleryLayout(count).modalRows).toEqual(rows);
        });
    });
});

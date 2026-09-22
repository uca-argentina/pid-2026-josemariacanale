import { getInjection } from '@/di/container';
import { DI_SYMBOLS } from '@/di/types';

// The only test that goes through the container: every binding resolves. Nothing gets called.
describe('container', () => {
    it.each(Object.keys(DI_SYMBOLS) as (keyof typeof DI_SYMBOLS)[])('resolves %s', (key) => {
        expect(getInjection(key)).toBeDefined();
    });
});

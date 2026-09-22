import type { IInstrumentationService } from '@/src/application/services/instrumentation.service.interface';

// ponytail: no-op pass-through, swap in Sentry spans when monitoring lands
export class InstrumentationService implements IInstrumentationService {
    startSpan<T>(_options: { name: string; op?: string }, callback: () => T): T {
        return callback();
    }
}

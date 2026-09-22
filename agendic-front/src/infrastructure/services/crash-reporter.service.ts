import type { ICrashReporterService } from '@/src/application/services/crash-reporter.service.interface';

// ponytail: console only, swap in Sentry.captureException when monitoring lands
export class CrashReporterService implements ICrashReporterService {
    report(error: unknown): string {
        const id = crypto.randomUUID();
        console.error(`[crash ${id}]`, error);
        return id;
    }
}

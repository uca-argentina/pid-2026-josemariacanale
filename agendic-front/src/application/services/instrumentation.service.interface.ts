export interface IInstrumentationService {
    startSpan<T>(options: { name: string; op?: string }, callback: () => T): T;
}

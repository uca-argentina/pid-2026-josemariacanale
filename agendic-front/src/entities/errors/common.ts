export class InputParseError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

// The backend API failed in a way the caller cannot act on (5xx, network, unexpected status).
// `status` is set when there was an HTTP response, absent when there was none (network down,
// API_URL missing) or when the body did not match the schema. The message is the back's own and
// is meant for the crash reporter, never for the Usuario.
export class ApiRequestError extends Error {
    readonly status?: number;

    constructor(message: string, options?: ErrorOptions & { status?: number }) {
        super(message, options);
        this.status = options?.status;
    }
}

export class NotFoundError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

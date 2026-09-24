export class InputParseError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

// The backend API failed in a way the caller cannot act on (5xx, network, unexpected status).
export class ApiRequestError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

export class NotFoundError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

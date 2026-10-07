export class DomainError extends Error {}

export class UnauthenticatedError extends DomainError {}

export class ForbiddenError extends DomainError {}

export class NotFoundError extends DomainError {}

export class ConflictError extends DomainError {}

export class BusinessRuleError extends DomainError {}

/** A verification code that doesn't match, or no longer does (ADR 0022). */
export class InvalidCodeError extends DomainError {}

/** Too many verification codes requested for the same email in the rate-limit window. */
export class TooManyRequestsError extends DomainError {}

/** A database failure with no domain meaning; answered as a generic 500. */
export class DatabaseOperationError extends DomainError {}

/** An external service (Clerk) failed; answered as 502. */
export class ExternalServiceError extends DomainError {}

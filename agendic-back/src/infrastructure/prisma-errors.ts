import { Prisma } from '../generated/prisma/client';

/**
 * Postgres 23P01 (exclusion violation) arrives as the generic P2039, per ADR 0004: recognised by the driver's
 * original code or, when that meta is absent, by the constraint's name in the message.
 */
export const isExclusionViolation = (
  error: Prisma.PrismaClientKnownRequestError,
  constraint: string,
) => {
  const cause = (
    error.meta as { driverAdapterError?: { cause?: { originalCode?: string } } }
  )?.driverAdapterError?.cause;
  return (
    error.code === 'P2039' &&
    (cause?.originalCode === '23P01' || error.message.includes(constraint))
  );
};

import { BusinessRuleError } from '../errors';

export interface Branch {
  id: number;
  businessId: number;
  name: string;
  address: string;
  opensAt: string; // HH:mm
  closesAt: string; // HH:mm
  timeZone: string; // IANA name, e.g. America/Argentina/Buenos_Aires
}

export interface CreateBranchInput {
  name: string;
  address: string;
  opensAt: string;
  closesAt: string;
  timeZone: string;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  opensAt?: string;
  closesAt?: string;
  timeZone?: string;
}

/** HH:mm strings are zero-padded and same length, so lexical comparison matches time-of-day order. */
export function assertValidHours(opensAt: string, closesAt: string): void {
  if (opensAt >= closesAt)
    throw new BusinessRuleError('closesAt must be after opensAt');
}

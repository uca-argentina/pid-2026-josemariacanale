import { Invitation } from './invitation';

export const INVITATIONS_REPOSITORY = Symbol('InvitationsRepository');

export interface InvitationsRepository {
  /** The Negocio's not yet expired Invitación for that email, if any. */
  findPending(
    businessId: number,
    email: string,
    now: Date,
  ): Promise<Invitation | null>;
  create(data: Omit<Invitation, 'id'>): Promise<Invitation>;
  /** The Invitación whatever its state, or null. */
  findById(id: number): Promise<(Invitation & { closedAt: Date | null }) | null>;
  /** Not yet expired nor closed Invitaciones sent to that email, with their Negocio. */
  listPendingByEmail(
    email: string,
    now: Date,
  ): Promise<(Invitation & { business: { name: string; slug: string } })[]>;
  /** Marks it accepted or rejected so it is no longer pending. */
  close(id: number, closedAt: Date): Promise<void>;
  /** Sets a new expiry on the Invitación. */
  renew(id: number, expiresAt: Date): Promise<void>;
  /** The Negocio's not yet expired Invitaciones. */
  listPending(businessId: number, now: Date): Promise<Invitation[]>;
}

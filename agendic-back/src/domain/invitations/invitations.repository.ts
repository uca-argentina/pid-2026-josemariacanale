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
  /** The Negocio's not yet expired Invitaciones. */
  listPending(businessId: number, now: Date): Promise<Invitation[]>;
}

import { Invitation } from '../../domain/invitations/invitation';

/** The Dueño's view of an Invitación. */
export const presentInvitation = ({
  id,
  email,
  expiresAt,
  branchIds,
}: Invitation) => ({
  id,
  email,
  expiresAt,
  branchIds,
});

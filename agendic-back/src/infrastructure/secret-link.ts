import { randomBytes } from 'node:crypto';

/** A new unguessable secret for a link that is the only way back to something: the Enlace del Turno, the link to Salir de la Lista de espera. */
export const generateSecretLink = (): string =>
  randomBytes(32).toString('base64url');

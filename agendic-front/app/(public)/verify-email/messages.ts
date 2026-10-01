/** Título y texto que la página de verificación le muestra al Cliente. */
export type VerifyBookingResult = { title: string; text: string };

/** Mensaje de un link sin token, usado, vencido o de un Turno que ya no se puede reservar. */
export const invalidLink: VerifyBookingResult = {
    title: 'No pudimos verificar tu turno',
    text: 'El link ya se usó o venció, o el turno ya no se puede reservar. Si no lo verificaste antes, reservá de nuevo.',
};

// ponytail: el back todavía no maneja invitaciones (un Empleado aún no es un Usuario). Cuando las tenga,
// esto sale de un controlador y Aceptar/Rechazar pasan a ser server actions.

export interface Invitation {
    id: string;
    business: { name: string; slug: string };
}

// Mismo Negocio que el grupo Empleado de mock-services.
export const pendingInvitations: Invitation[] = [
    { id: 'inv-estudio-norte', business: { name: 'Estudio Norte', slug: 'estudio-norte' } },
];

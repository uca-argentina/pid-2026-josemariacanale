/** 422: the Empleado is the last one attending a Servicio, so they can neither be dado de baja nor stop offering it. */
export class LastEmployeeError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 422: el email invitado ya es Empleado del Negocio. */
export class AlreadyEmployeeError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 422: la Invitación venció o el Usuario ya es Empleado del Negocio; el mensaje es el del back. */
export class InvitationNotAcceptableError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 422: la Invitación ya se aceptó o rechazó, así que no se puede reenviar ni cancelar. */
export class InvitationNotPendingError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 400 `branchIds must have at least one Branch`: el Negocio tiene varias Sucursales y no se eligió ninguna. */
export class BranchesRequiredError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 422 `Branch <branchId> is not a Branch of Business <businessId>`: una Sucursal elegida ya no es del Negocio. */
export class BranchNotOfBusinessError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/** 422 `The Dueño works at every Branch`: al Empleado del Dueño no se le saca ninguna Sucursal. */
export class OwnerWorksAtEveryBranchError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

/**
 * 409 `Los Turnos que se cancelan cambiaron`: entre la vista previa y el guardado cambió la lista de Turnos que
 * cancela cambiar las Sucursales del Empleado, y el back no guardó nada. El Dueño no ve este mensaje: ve la lista nueva.
 */
export class EmployeeBranchesBookingsChangedError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

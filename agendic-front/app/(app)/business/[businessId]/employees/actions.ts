"use server";

import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { isSessionExpired } from "@/app/api-error";
import { SIGN_IN_PATH } from "@/app/routes";
import { getInjection } from "@/di/container";
import type { DI_RETURN_TYPES } from "@/di/types";
import type {
  LeftOutsidePreview,
  LeftOutsideSaved,
} from "@/app/(app)/_components/use-left-outside-save";
import {
  ApiRequestError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import type { EmployeeStatsQuery } from "@/src/entities/models/analytics";
import {
  AlreadyEmployeeError,
  BranchesRequiredError,
  BranchNotOfBusinessError,
  EmployeeBranchesBookingsChangedError,
  InvitationNotPendingError,
  LastEmployeeError,
  OwnerWorksAtEveryBranchError,
} from "@/src/entities/errors/employee";

export type EmployeeActionResult =
  { ok: true } | { ok: false; message: string; field?: "email" | "branchIds" };

// Las dos refrescan la página: la tabla sale siempre de lo que devuelve el back.

export async function addEmployeeAction(
  payload: unknown,
): Promise<EmployeeActionResult> {
  try {
    await getInjection("IAddEmployeeController")(payload);
    refresh();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
    if (error instanceof AlreadyEmployeeError)
      return {
        ok: false,
        message: "Esa persona ya es Empleado de tu Negocio.",
        field: "email",
      };
    if (error instanceof BranchesRequiredError)
      return {
        ok: false,
        message: "Elegí al menos una Sucursal.",
        field: "branchIds",
      };
    if (error instanceof BranchNotOfBusinessError)
      return {
        ok: false,
        message:
          "Una de las Sucursales ya no es de tu Negocio. Recargá la página y elegí de nuevo.",
        field: "branchIds",
      };
    // La Sesión vencida la resuelve el Usuario solo: se lo manda a Iniciar sesión.
    if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
    if (error instanceof InputParseError)
      return { ok: false, message: "Revisá los datos e intentá de nuevo." };
    getInjection("ICrashReporterService").report(error);
    return {
      ok: false,
      message: "No pudimos enviar la invitación. Intentá de nuevo.",
    };
  }
}

export async function retireEmployeeAction(
  payload: unknown,
): Promise<EmployeeActionResult> {
  try {
    await getInjection("IRetireEmployeeController")(payload);
    refresh();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error); // redirect/notFound/dynamic usage are Next's control flow, not failures
    if (error instanceof LastEmployeeError)
      return {
        ok: false,
        message:
          "Es el único Empleado de un Servicio. Sumá a otro a ese Servicio antes de darlo de baja.",
      };
    if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
    if (error instanceof InputParseError)
      return { ok: false, message: "Revisá los datos e intentá de nuevo." };
    getInjection("ICrashReporterService").report(error);
    return {
      ok: false,
      message: "No pudimos dar de baja al Empleado. Intentá de nuevo.",
    };
  }
}

/**
 * Corre la acción sobre una Invitación pendiente y refresca la tabla.
 *
 * El 404 y el 422 del back vuelven como mensaje y también refrescan: la Invitación ya no está.
 */
async function runInvitationAction(
  controller: "IResendInvitationController" | "ICancelInvitationController",
  payload: unknown,
  failureMessage: string,
): Promise<EmployeeActionResult> {
  try {
    await getInjection(controller)(payload);
    refresh();
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    if (
      error instanceof InvitationNotPendingError ||
      (error instanceof ApiRequestError && error.status === 404)
    ) {
      refresh();
      return { ok: false, message: "La Invitación ya no está pendiente." };
    }
    if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
    if (error instanceof InputParseError)
      return { ok: false, message: "Revisá los datos e intentá de nuevo." };
    getInjection("ICrashReporterService").report(error);
    return { ok: false, message: failureMessage };
  }
}

/** Reenvía la Invitación pendiente y renueva su vencimiento. */
export async function resendInvitationAction(
  payload: unknown,
): Promise<EmployeeActionResult> {
  return runInvitationAction(
    "IResendInvitationController",
    payload,
    "No pudimos reenviar la invitación. Intentá de nuevo.",
  );
}

/** Cancela la Invitación pendiente; la fila sale de la tabla. */
export async function cancelInvitationAction(
  payload: unknown,
): Promise<EmployeeActionResult> {
  return runInvitationAction(
    "ICancelInvitationController",
    payload,
    "No pudimos cancelar la invitación. Intentá de nuevo.",
  );
}

/** Un Turno que cambiar las Sucursales del Empleado cancela, como lo muestra el diálogo de confirmación. */
export type EmployeeBranchesBooking = Awaited<
  ReturnType<DI_RETURN_TYPES["IPreviewEmployeeBranchesController"]>
>[number];

/**
 * Corre la acción sobre las Sucursales de un Empleado y traduce sus fallos a un mensaje para el Dueño. El 409 de
 * Turnos vuelve como `leftOutChanged`, sin mensaje. Si el Empleado ya no existe (404) refresca la tabla.
 */
async function settleEmployeeBranches<T>(
  run: () => Promise<T>,
  unexpected: string,
): Promise<
  | { ok: true; value: T }
  | { ok: false; message: string }
  | { ok: false; leftOutChanged: true }
> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    if (error instanceof EmployeeBranchesBookingsChangedError)
      return { ok: false, leftOutChanged: true };
    unstable_rethrow(error);
    if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
    if (error instanceof LastEmployeeError)
      return {
        ok: false,
        message: "Es el último Empleado de un Servicio de esa Sucursal.",
      };
    if (error instanceof OwnerWorksAtEveryBranchError)
      return {
        ok: false,
        message: "El Dueño trabaja en todas las Sucursales.",
      };
    if (error instanceof BranchesRequiredError)
      return { ok: false, message: "Elegí al menos una Sucursal." };
    if (error instanceof BranchNotOfBusinessError)
      return {
        ok: false,
        message:
          "Una de las Sucursales ya no es de tu Negocio. Recargá la página y elegí de nuevo.",
      };
    if (error instanceof NotFoundError) {
      refresh();
      return {
        ok: false,
        message:
          "Este Empleado ya no está en tu Negocio. Actualizamos la lista.",
      };
    }
    if (error instanceof InputParseError)
      return { ok: false, message: "Revisá los datos e intentá de nuevo." };
    getInjection("ICrashReporterService").report(error);
    return { ok: false, message: unexpected };
  }
}

/** Los Turnos que cambiar las Sucursales del Empleado cancelaría. No guarda ni refresca nada. */
export async function previewEmployeeBranchesAction(
  employeeId: number,
  branchIds: number[],
): Promise<LeftOutsidePreview<EmployeeBranchesBooking>> {
  const unexpected =
    "No pudimos revisar los Turnos del Empleado. Intentá de nuevo.";
  const result = await settleEmployeeBranches(
    () =>
      getInjection("IPreviewEmployeeBranchesController")({
        employeeId,
        branchIds,
      }),
    unexpected,
  );
  if (result.ok) return { ok: true, bookings: result.value };
  return "message" in result ? result : { ok: false, message: unexpected };
}

/**
 * Cambia las Sucursales del Empleado y cancela los Turnos de `cancelBookingIds`. Con el 409 de Turnos responde
 * `leftOutChanged` y no refresca la tabla: nada se guardó.
 */
export async function changeEmployeeBranchesAction(
  employeeId: number,
  branchIds: number[],
  cancelBookingIds: number[],
): Promise<LeftOutsideSaved> {
  const result = await settleEmployeeBranches(
    () =>
      getInjection("IChangeEmployeeBranchesController")({
        employeeId,
        branchIds,
        cancelBookingIds,
      }),
    "No pudimos guardar las Sucursales. Intentá de nuevo.",
  );
  if (!result.ok) return result;
  refresh();
  return { ok: true, cancelledBookings: result.value.cancelledBookings };
}

/** Las estadísticas del Empleado para las tarjetas de su perfil. */
export type EmployeeStatsData = Awaited<
  ReturnType<DI_RETURN_TYPES["IGetEmployeeStatsController"]>
>;

/** Las estadísticas, o un error sin detalle: el Sheet sigue mostrando el perfil (el real va al reporte de fallas). */
export type EmployeeStatsResult =
  { ok: true; data: EmployeeStatsData } | { ok: false };

/**
 * Las estadísticas de un Empleado en un rango de días. El rango sale del browser, que es quien sabe en qué zona
 * está "hoy": por eso es una acción y no parte de la página.
 */
export async function loadEmployeeStatsAction(
  query: EmployeeStatsQuery,
): Promise<EmployeeStatsResult> {
  try {
    return {
      ok: true,
      data: await getInjection("IGetEmployeeStatsController")(query),
    };
  } catch (error) {
    unstable_rethrow(error);
    if (isSessionExpired(error)) redirect(SIGN_IN_PATH);
    getInjection("ICrashReporterService").report(error);
    return { ok: false };
  }
}

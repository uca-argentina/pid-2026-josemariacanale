import type { OutOfOffice } from '@/src/entities/models/out-of-office';

/** Períodos Fuera de la oficina del Usuario con Sesión contra la API del back. */
export interface IOutOfOfficeRepository {
    /**
     * Los períodos que no terminaron, ordenados por inicio.
     *
     * @throws {UnauthenticatedError} no hay Sesión válida (401)
     */
    listOutOfOffice(): Promise<OutOfOffice[]>;
}

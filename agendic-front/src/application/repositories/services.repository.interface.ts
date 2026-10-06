import type {
    CatalogService,
    CreatePersonalService,
    PersonalService,
    ServiceEmployeeAvailability,
    CreateService,
    RemovedEmployee,
    RetiredService,
    ServiceCatalogGroup,
    ServiceEmployeeRef,
    UpdateService,
} from '@/src/entities/models/service';

/**
 * The panel's Servicios. "Only the Dueño" creates, edits and retires them, and the back enforces it: anyone else gets
 * ApiRequestError (403). Offering a Servicio is also open to the Empleado, for themselves only.
 */
export interface IServicesRepository {
    /**
     * Lists the Usuario's catalog: one group per Negocio where they are an active Empleado; empty when there is none.
     *
     * @throws {ApiRequestError} the back failed or answered an unexpected body
     */
    listMyCatalog(): Promise<ServiceCatalogGroup[]>;
    /**
     * Creates a Servicio in the Sucursal, attended by the given Empleados.
     *
     * @throws {ServiceSlugTakenError} another Servicio of the Sucursal uses that tramo (409)
     * @throws {ServiceNameTakenError} another Servicio of the Sucursal has that name (409)
     * @throws {ApiRequestError} not the Dueño (403), invalid data (400) or any other failure
     */
    createService(input: CreateService): Promise<CatalogService>;
    /**
     * Lists the Usuario's Servicios personales, the hidden ones included; empty when there is none.
     *
     * @throws {ApiRequestError} the back failed or answered an unexpected body
     */
    listPersonalServices(): Promise<PersonalService[]>;
    /**
     * Creates a Servicio personal of the Usuario, attended with one of their Availability.
     *
     * @throws {ServiceSlugTakenError} another Servicio personal of the Usuario uses that tramo (409)
     * @throws {ServiceNameTakenError} another Servicio personal of the Usuario has that name (409)
     * @throws {NotFoundError} the Availability does not exist or is not the Usuario's (404)
     * @throws {ApiRequestError} invalid data (400) or any other failure
     */
    createPersonalService(input: CreatePersonalService): Promise<PersonalService>;
    /**
     * Changes the fields sent of a Servicio, del Negocio or personal; `depositPercent: null` drops the Seña.
     *
     * @throws {ServiceSlugTakenError} another Servicio of the Sucursal, or of the Usuario, uses that tramo (409)
     * @throws {ServiceNameTakenError} another Servicio of the Sucursal, or of the Usuario, has that name (409)
     * @throws {NotFoundError} the Servicio, or the Availability sent, does not exist (404)
     * @throws {ApiRequestError} not the Dueño (403), invalid data (400) or any other failure
     */
    updateService(input: UpdateService): Promise<CatalogService | PersonalService>;
    /**
     * Dar de baja: retires the Servicio and cancels its future Turnos.
     *
     * @throws {NotFoundError} the Servicio does not exist or was already retired (404)
     * @throws {ApiRequestError} not the Dueño (403) or any other failure
     */
    retireService(id: number): Promise<RetiredService>;
    /**
     * Ofrecer un Servicio: the Empleado starts attending it with their default Availability.
     *
     * @throws {EmployeeNotAssignableError} the Empleado is not of the Negocio or was dado de baja (422)
     * @throws {NotFoundError} the Servicio or the Empleado do not exist (404)
     * @throws {ApiRequestError} acting for another Empleado without being the Dueño (403), already offered (409) or any
     *   other failure
     */
    assignEmployee(input: ServiceEmployeeRef): Promise<CatalogService>;
    /**
     * Dejar de ofrecer un Servicio: cancels the Empleado's future Turnos of it.
     *
     * @throws {LastEmployeeError} the Empleado is the last one attending it (422)
     * @throws {NotFoundError} the Servicio or the Empleado do not exist (404)
     * @throws {ApiRequestError} acting for another Empleado without being the Dueño (403) or any other failure
     */
    removeEmployee(input: ServiceEmployeeRef): Promise<RemovedEmployee>;
    /**
     * Changes the Availability the Empleado attends the Servicio with. Their Turnos already taken stay as they are.
     *
     * @throws {AvailabilityNotOfEmployeeError} the Availability belongs to another Empleado (422)
     * @throws {NotFoundError} the Empleado does not attend the Servicio, or it does not exist (404)
     * @throws {ApiRequestError} acting for another Empleado without being the Dueño (403) or any other failure
     */
    changeEmployeeAvailability(input: ServiceEmployeeAvailability): Promise<CatalogService>;
}

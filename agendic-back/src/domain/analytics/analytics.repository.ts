/** Token de inyección del puerto {@link AnalyticsRepository}. */
export const ANALYTICS_REPOSITORY = Symbol('AnalyticsRepository');

/** Los KPIs de analíticas, en el orden en que se responden. */
export const KPI_NAMES = [
  'booked',
  'attended',
  'rescheduled',
  'cancelled',
  'rejected',
  'pending',
  'noShows',
  'employeeNoShows',
  'averageRating',
  'csat',
  'revenue',
] as const;

/** Nombre de un KPI de analíticas. */
export type KpiName = (typeof KPI_NAMES)[number];

/** El valor de cada KPI en un período; `null` si no hay con qué calcularlo (sin Calificaciones). */
export type KpiValues = Record<KpiName, number | null>;

/**
 * Qué Turnos mira una consulta de analíticas, ya resuelto por el caso de uso.
 * `personal`: los Servicios personales del Usuario; `timeZone` es la de su Availability predeterminada.
 * `business`: los Servicios del Negocio, cada Turno en la zona de su Sucursal; `branchId` los acota a una
 * Sucursal y `employeeId` a un Empleado (forzado cuando quien mira no es el Dueño).
 */
export type AnalyticsScope =
  | { kind: 'personal'; userId: number; timeZone: string }
  | {
      kind: 'business';
      businessId: number;
      branchId?: number;
      employeeId?: number;
    };

/** Rango de fechas locales YYYY-MM-DD, inclusivo en los dos extremos. */
export type DateRange = { from: string; to: string };

/** Cada cuánto agrupa la tendencia: por día, semana o mes. */
export type Granularity = 'day' | 'week' | 'month';

/** Los KPIs que tienen serie en la tendencia. */
export const TREND_NAMES = [
  'booked',
  'attended',
  'rescheduled',
  'cancelled',
  'rejected',
  'noShows',
  'employeeNoShows',
] as const;

/** Nombre de un KPI con serie en la tendencia. */
export type TrendName = (typeof TREND_NAMES)[number];

/** Un período de la tendencia: `bucket` es la fecha local en que arranca. */
export type TrendPoint = { bucket: string } & Record<TrendName, number>;

/** Un Servicio del ranking con su cantidad de Turnos. */
export type PopularService = { serviceId: number; name: string; count: number };

/** Una Calificación reciente; `employeeName` es `null` en los Servicios personales. */
export type RecentRating = {
  score: number;
  comment: string | null;
  createdAt: string;
  clientName: string;
  serviceName: string;
  employeeName: string | null;
};

/** Un Empleado de un ranking con su cantidad de Turnos. */
export type RankedEmployee = {
  employeeId: number;
  name: string;
  imageUrl: string | null;
  count: number;
};

/** Los rankings de Empleados del Negocio, solo para el Dueño. */
export type EmployeeRankings = {
  mostBookedEmployees: RankedEmployee[];
  leastBookedEmployees: RankedEmployee[];
  mostCancelledEmployees: RankedEmployee[];
};

/** Los Turnos por Empleado y período: `counts[i]` es el de `buckets[i]`. */
export type EmployeesPerPeriod = {
  buckets: string[];
  rows: {
    employeeId: number;
    name: string;
    imageUrl: string | null;
    counts: number[];
  }[];
};

/** Lo que se grafica y lista debajo de los KPIs. */
export type AnalyticsBreakdown = {
  trend: TrendPoint[];
  popularServices: PopularService[];
  recentRatings: RecentRating[];
};

/** Puerto de lectura de analíticas: el único lugar que sabe contar. */
export interface AnalyticsRepository {
  /**
   * Los KPIs del alcance en el rango, opcionalmente de un solo Servicio. `now` decide qué Turnos ya terminaron.
   */
  kpis(
    scope: AnalyticsScope,
    range: DateRange,
    now: Date,
    serviceId?: number,
  ): Promise<KpiValues>;

  /**
   * La tendencia por `granularity` (con todos los períodos del rango, en 0 si no tienen Turnos), los 5 Servicios
   * con más Turnos y las 10 Calificaciones más recientes, opcionalmente de un solo Servicio. `weekStart` es
   * el día en que arranca la semana (0 = domingo).
   */
  breakdown(
    scope: AnalyticsScope,
    range: DateRange,
    now: Date,
    granularity: Granularity,
    weekStart: number,
    serviceId?: number,
  ): Promise<AnalyticsBreakdown>;

  /** Todos los Servicios personales del Usuario, ocultos y dados de baja incluidos, por nombre. */
  personalServices(userId: number): Promise<{ id: number; name: string }[]>;

  /**
   * Los tops 5 de Empleados vigentes del Negocio en el rango: más y menos reservados (Turnos con `startsAt`
   * en el rango, sin Rechazados ni originales reagendados; los menos reservados incluyen a los que tienen 0)
   * y con más Cancelaciones (por `cancelledAt`, sin los reagendados). Respeta `scope.branchId` y `serviceId`
   * e ignora `scope.employeeId`: compara Empleados entre sí.
   */
  employeeRankings(
    scope: Extract<AnalyticsScope, { kind: 'business' }>,
    range: DateRange,
    serviceId?: number,
  ): Promise<EmployeeRankings>;

  /**
   * Los Turnos de cada Empleado vigente del Negocio por período de `granularity`: `buckets` trae el inicio de
   * todos los períodos del rango y cada fila, una por Empleado por nombre (con todo en 0 si no tiene Turnos),
   * su cantidad en cada uno. Cuenta Turnos con `startsAt` en el período, sin Rechazados ni originales
   * reagendados. Respeta `scope.branchId` y `serviceId` e ignora `scope.employeeId`. `weekStart` es el día en
   * que arranca la semana (0 = domingo).
   */
  employeesPerPeriod(
    scope: Extract<AnalyticsScope, { kind: 'business' }>,
    range: DateRange,
    granularity: Granularity,
    weekStart: number,
    serviceId?: number,
  ): Promise<EmployeesPerPeriod>;

  /** Todos los Servicios de las Sucursales del Negocio, ocultos y dados de baja incluidos, por nombre. */
  businessServices(businessId: number): Promise<{ id: number; name: string }[]>;
}

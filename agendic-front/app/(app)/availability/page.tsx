import { getInjection } from '@/di/container';
import { AvailabilityView } from './_components/AvailabilityView';
import { groups } from '@/app/(app)/_components/mock-services';

// ponytail: mock; los Servicios que atendǸs salen del mock de Servicios. Con backend, un controller.
const offeredServices = groups.flatMap((g) =>
    g.services
        .filter((s) => s.offeredByMe)
        .map((s) => ({ id: s.id, name: s.name, availabilityId: s.availabilityId })),
);

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ employee?: string }> }) {
    const params = await searchParams;
    const listMyEmployeesController = getInjection('IListMyEmployeesController');
    const result = await listMyEmployeesController();

    if (!result || result.employees.length === 0) {
        return <div>No hay empleados</div>;
    }

    const { employees } = result;
    const selectedEmployeeId = params.employee ? Number(params.employee) : employees[0].id;
    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || employees[0];

    const listAvailabilitiesController = getInjection('IListAvailabilitiesController');
    const availabilities = await listAvailabilitiesController({ employeeId: selectedEmployee.id });

    const getEmployeeOverridesController = getInjection('IGetEmployeeOverridesController');
    const overrides = await getEmployeeOverridesController({ employeeId: selectedEmployee.id });

    return <AvailabilityView 
        key={selectedEmployee.id}
        initialAvailabilities={availabilities} 
        initialServices={offeredServices} 
        initialOverrides={overrides}
        employees={employees}
        selectedEmployeeId={selectedEmployee.id}
    />;
}

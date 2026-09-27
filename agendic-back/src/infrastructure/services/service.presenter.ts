import { Service } from '../../domain/services/service';

export const presentService = (service: Service) => ({
  id: service.id,
  branchId: service.branchId,
  name: service.name,
  description: service.description,
  category: service.category,
  durationMinutes: service.durationMinutes,
  price: service.price,
  ...(service.depositPercent != null
    ? { depositPercent: service.depositPercent }
    : {}),
  ...(service.depositAmount != null
    ? { depositAmount: service.depositAmount }
    : {}),
  employees: service.employees.map(({ id, name }) => ({ id, name })),
});

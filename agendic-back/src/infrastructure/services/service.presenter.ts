import { ServiceCatalogGroup } from '../../application/services/list-my-services.use-case';
import { Service } from '../../domain/services/service';

/** The Servicio as the public pages and the Servicio part of POST /businesses see it: no Cabinas (ADR 0030). */
export const presentService = (service: Service) => ({
  id: service.id,
  branchId: service.branchId,
  userId: service.userId,
  availabilityId: service.availabilityId,
  name: service.name,
  description: service.description,
  category: service.category,
  durationMinutes: service.durationMinutes,
  price: service.price,
  depositPercent: service.depositPercent,
  requiresApproval: service.requiresApproval,
  slug: service.slug,
  hidden: service.hidden,
  prepMinutes: service.prepMinutes,
  dailyLimit: service.dailyLimit,
  slotInterval: service.slotInterval,
  minimumNoticeMinutes: service.minimumNoticeMinutes,
  repeatEveryWeeks: service.repeatEveryWeeks,
  repeatMaxBookings: service.repeatMaxBookings,
  employees: service.employees.map(({ id, name, availabilityId, imageUrl, slug }) => ({
    id,
    name,
    availabilityId,
    imageUrl,
    slug,
  })),
});

/** The Servicio as the panel sees it: with the Cabinas it admits. */
export const presentPanelService = (service: Service) => ({
  ...presentService(service),
  cabins: service.cabins.map(({ id, name }) => ({ id, name })),
});

export const presentCatalogGroup = ({
  business,
  role,
  employeeId,
  branches,
}: ServiceCatalogGroup) => ({
  business: {
    id: business.id,
    name: business.name,
    slug: business.slug,
    logoUrl: business.logoUrl,
  },
  role,
  employeeId,
  branches: branches.map(({ id, name, slug, services }) => ({
    id,
    name,
    slug,
    services: services.map(presentPanelService),
  })),
});

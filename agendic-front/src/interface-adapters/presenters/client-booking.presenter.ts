import type { ClientBooking } from '@/src/entities/models/client-booking';

/**
 * El Turno del Cliente como lo ven las pantallas del Enlace del Turno: lo comparten los controllers de Abrir, Cancelar,
 * Reagendar, Pagar la Seña, marcar la Ausencia del Anfitrión y Calificar, así un campo nuevo se suma en un solo lugar.
 */
export const presentClientBooking = (booking: ClientBooking) => ({
    id: booking.id,
    status: booking.status,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    timeZone: booking.timeZone,
    notes: booking.notes,
    clientName: booking.clientName,
    serviceId: booking.serviceId,
    employeeId: booking.employeeId,
    employeeChosen: booking.employeeChosen,
    depositAmount: booking.depositAmount,
    depositPaidAt: booking.depositPaidAt,
    employeeNoShowAt: booking.employeeNoShowAt,
    canMarkEmployeeNoShow: booking.canMarkEmployeeNoShow,
    rating: booking.rating,
    canRate: booking.canRate,
    service: booking.service,
    employeeName: booking.employeeName,
    business: booking.business,
    branch: booking.branch,
    user: booking.user,
    cancellationReason: booking.cancellationReason,
});

import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../domain/clock';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from '../../domain/errors';
import { PrismaService } from '../prisma.service';

const MINUTOS_ANTES_DEL_INICIO = 30;
const MINUTOS_DE_TOLERANCIA = 10;

const MINUTO = 60_000;

type ConLlegada = { startsAt: Date; llegoEn: Date | null };

export const llegoTarde = ({ startsAt, llegoEn }: ConLlegada) =>
  llegoEn !== null &&
  llegoEn.getTime() - startsAt.getTime() > MINUTOS_DE_TOLERANCIA * MINUTO;

const conLlegoTarde = <T extends ConLlegada>(turno: T) => ({
  ...turno,
  llegoTarde: llegoTarde(turno),
});

@Injectable()
export class LlegadaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async agendaDelDia(userId: number, fecha: string) {
    const desde = new Date(`${fecha}T00:00:00-03:00`);
    if (Number.isNaN(desde.getTime())) {
      throw new BusinessRuleError(`La fecha ${fecha} no es YYYY-MM-DD`);
    }
    const turnos = await this.prisma.booking.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'BOOKED'] },
        startsAt: { gte: desde, lt: new Date(desde.getTime() + 86_400_000) },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        noShowAt: true,
        employeeNoShowAt: true,
        llegoEn: true,
        client: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
    return turnos.map(conLlegoTarde);
  }

  async registrar(userId: number, bookingId: number) {
    const turno = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!turno) throw new NotFoundError(`No existe el Turno ${bookingId}`);
    if (turno.userId !== userId) {
      throw new ForbiddenError(
        `Solo quien atiende el Turno ${bookingId} registra la Llegada`,
      );
    }
    if (turno.noShowAt) {
      throw new BusinessRuleError(
        `El Turno ${bookingId} tiene una Ausencia del Invitado marcada`,
      );
    }
    if (turno.employeeNoShowAt) {
      throw new BusinessRuleError(
        `El Turno ${bookingId} tiene una Ausencia del Anfitrión marcada`,
      );
    }
    if (turno.status !== 'BOOKED') {
      throw new BusinessRuleError(
        `El Turno ${bookingId} no está aceptado (está ${turno.status})`,
      );
    }
    if (turno.llegoEn) {
      throw new BusinessRuleError(
        `El Turno ${bookingId} ya tiene la Llegada registrada`,
      );
    }

    const ahora = this.clock.now();
    const desde = new Date(
      turno.startsAt.getTime() - MINUTOS_ANTES_DEL_INICIO * MINUTO,
    );
    if (ahora < desde) {
      throw new BusinessRuleError(
        `La Llegada del Turno ${bookingId} se registra desde ${MINUTOS_ANTES_DEL_INICIO} minutos antes del inicio`,
      );
    }
    if (ahora >= turno.endsAt) {
      throw new BusinessRuleError(
        `El Turno ${bookingId} ya terminó: no se puede registrar la Llegada`,
      );
    }

    return conLlegoTarde(
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { llegoEn: ahora },
        select: { id: true, startsAt: true, llegoEn: true },
      }),
    );
  }

  async deEnlace(link: string) {
    const turno = await this.prisma.booking.findUnique({
      where: { link },
      select: { startsAt: true, llegoEn: true },
    });
    if (!turno) throw new NotFoundError('No hay un Turno con ese Enlace');
    return conLlegoTarde(turno);
  }

  async asegurarQueNoLlego(
    turno: { id: number } | { link: string },
    accion: 'cancelar' | 'reagendar' | 'marcar con Ausencia',
  ) {
    const idOlink = 'id' in turno ? { id: turno.id } : { link: turno.link };
    const encontrado = await this.prisma.booking.findUnique({
      where: idOlink,
      select: { id: true, llegoEn: true },
    });
    if (encontrado?.llegoEn) {
      throw new BusinessRuleError(
        `El Turno ${encontrado.id} tiene la Llegada registrada: no se puede ${accion}`,
      );
    }
  }
}

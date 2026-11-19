import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  BusinessRuleError,
  ConflictError,
  InvalidCodeError,
  NotFoundError,
} from '../../domain/errors';
import { localDate } from '../../domain/slots/slot';
import { WaitlistEntry } from '../../domain/waitlist/waitlist-entry';
import { serviceTimeZone } from '../services/service-time-zone';
import { SLOT_WAITLIST_REPOSITORY } from '../../domain/slot-waitlist/slot-waitlist.repository';
import { SlotWaitlistRepository } from '../../../dist/domain/slot-waitlist/slot-waitlist.repository';

const logger = new Logger('JoinWaitlist');

export interface JoinSlotWaitlistInput {
  clientName: string;
  email: string;
  employeeId: number | null;
  serviceId: number;
  startsAt: Date;
}

/** Anotarse en la Lista de espera de un Servicio para un día lleno. */
@Injectable()
export class JoinWaitlistUseCase {
  constructor(
    @Inject(SLOT_WAITLIST_REPOSITORY)
    private readonly waitlist: SlotWaitlistRepository,
  ) {}
  async execute(
    input: JoinSlotWaitlistInput,
  ): Promise<{ serviceId: number; date: string; created: boolean }> {
    return { ...result, created: true };
  }
}

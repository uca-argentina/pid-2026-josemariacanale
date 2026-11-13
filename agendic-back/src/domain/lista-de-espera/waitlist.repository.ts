import {
  AliveWaitlistEntry,
  CreateWaitlistEntryInput,
  WaitlistEntry,
  WaitlistEntryView,
} from './waitlist-entry';

export const WAITLIST_REPOSITORY = Symbol('WaitListRepository');

// anotaciones de la lista de espera
// algunas funciones

export interface WaitlistRepository {
  
  findAlive(
    serviceId: number,
    date: string,
    email: string,
  ): Promise<WaitlistEntry | null>;
  
  create(input: CreateWaitlistEntryInput): Promise<WaitlistEntry>;
  
  findByLinkIncludeService(link: string): Promise<WaitlistEntryView | null>;
  
  leave(id: number, now: Date): Promise<void>;
  
  listAliveIncludeService(now: Date): Promise<AliveWaitlistEntry[]>;
  
  listWithLiveBooking(entries: AliveWaitlistEntry[]): Promise<Set<number>>;
  
  markNotified(id: number, now: Date): Promise<void>;
  
  rearm(id: number): Promise<void>;
}

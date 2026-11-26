# Consignas de parcial: resoluciones

Una resolución por consigna de `consignas-parcial.md`, con la misma complejidad que Reclamos: Prisma directo desde un
servicio de Nest, sin casos de uso nuevos, y en el front `page.tsx` + `actions.ts` + los componentes de
`app/_components/quick/` (están explicados en `guia-front-minimo.md`).

Es **lo mínimo que cumple cada consigna**. Lo que la consigna deja abierto está decidido en una tabla al principio
de cada una, y lo que queda afuera a propósito, al final.

> **Estado:** todo el código compila contra `practica-de-parcial` (`npx tsc --noEmit` en el back y en el front) y el
> back arranca con Nest. **No está probado contra una base ni con Postman.** Si algo falla al correrlo, el error
> es de la resolución, no tuyo.

## Índice

| # | Consigna | Back | Front |
|---|---|---|---|
| 0 | [Lista de espera con ofertas](#0-lista-de-espera-con-ofertas-back) | `slot-waitlist/` | — (ver 5) |
| 1 | [Paquetes de sesiones](#1-paquetes-de-sesiones-back) | `packs/` | — |
| 2 | [Ausencia de un profesional con turnos tomados](#2-ausencia-de-un-profesional-con-turnos-tomados-back) | `absences/` | — |
| 3 | [Penalización por no presentarse](#3-penalización-por-no-presentarse-back) | `penalties/` | — |
| 4 | [Reserva temporal (retención)](#4-reserva-temporal-durante-la-confirmación-back) | `holds/` | — |
| 5 | [Lista de espera, vista del cliente](#5-lista-de-espera-vista-del-cliente-front) | 2 endpoints más en `slot-waitlist/` | `app/lista-de-espera/` |
| 6 | [Agenda diaria del profesional](#6-agenda-diaria-del-profesional-front) | `agenda/` | `app/(app)/agenda/` |
| 7 | [Reprogramación con política](#7-reprogramación-con-política-del-establecimiento-front) | nada: ya existe | `app/turnos/[link]/reprogramar/` |
| 8 | [Dashboard administrativo](#8-dashboard-administrativo-front) | `dashboard/` | `app/(app)/tablero/` |

Las consignas de **back** no tienen pantallas: la consigna no las pide y se validan con Postman. Las de **front**
suman al back solo el endpoint que les falta (la consigna permite un repositorio mockeado; acá preferimos el endpoint
real, que es más corto que el mock).

---

## Antes de empezar

### En el back

1. En `src/infrastructure/infrastructure.module.ts`, agregá `PrismaService` a `exports` (como en Reclamos).
2. Hay dos formas de colgar una feature, según lo que use:

| La feature usa... | Dónde va | Ejemplos |
|---|---|---|
| Solo Prisma | Módulo propio, como Reclamos: `xxx.module.ts` con `imports: [UsersModule]`, y el módulo en los `imports` de `infrastructure.module.ts` | Paquetes, Agenda, Dashboard |
| Un caso de uso de Turnos (`CreateBookingUseCase`, `ListSlotsUseCase`, `RescheduleBookingByLinkUseCase`) | Sin módulo: el controller y el servicio se suman a `BookingsModule`, que ya tiene esos casos de uso | Lista de espera, Ausencia, Penalización, Retención |

Para el segundo caso, en `src/infrastructure/bookings/bookings.module.ts`:

```ts
import { HoldsController } from '../holds/holds.controller';
import { HoldsService } from '../holds/holds.service';
// ...
@Module({
  imports: [UsersModule, HolidaysModule, StreaksModule],
  controllers: [BookingsController, BookingLinksController, HoldsController], // + tu controller
  providers: [
    // ...los que ya están
    HoldsService, // + tu servicio
  ],
})
export class BookingsModule {}
```

¿Por qué no un módulo propio? Porque esos casos de uso dependen de otros (`ListUserHolidayPeriodsUseCase`,
`ClientFileStreakReader`...) y habría que repetir todos los `imports` de `BookingsModule`. Sumarse ahí es una línea.

3. **Código de verificación:** reservar (`POST /bookings`) pide un código. En desarrollo poné
   `BOOKING_CODE_FIXED=AAAAAA` en `agendic-back/.env` y cualquier email reserva con `"code": "AAAAAA"`.

4. Después de tocar `schema.prisma`: `npx prisma migrate dev --name <nombre>` desde `agendic-back/`.

### En el front

Las piezas de `app/_components/quick/` y `app/_components/back.ts` (todas en `guia-front-minimo.md`, sección 0).

---

## 0. Lista de espera con ofertas (back)

### Decisiones

| Pregunta | Decisión | Por qué |
|---|---|---|
| ¿Cómo se identifica "un turno tomado"? | Por Servicio + horario de inicio (`serviceId`, `startsAt`) | El que se anota no tiene el Enlace del Turno de otro |
| ¿Cuándo se crea la oferta "al liberarse"? | Al consultar: `advance()` mira si el horario quedó libre y se lo ofrece al primero | La consigna dice que el vencimiento se procesa al consultar o aceptar; la liberación también, así no hay que tocar Cancelar |
| ¿Quién es "elegible"? | El primero en estado `WAITING` por orden de anotación, si el horario todavía no pasó | — |
| "El horario queda reservado temporalmente" | `POST /bookings` llama a `assertNotOffered`: 409 si hay una oferta vigente de otro email | Es la única puerta para reservar |
| ¿Cómo se acepta sin Sesión? | El link de la Anotación es la credencial, y el código se pide adentro (`codes.request`) | Igual que el Enlace del Turno |
| "Vuelve a publicarse como disponible" | No hace nada: si nadie más espera, el horario ya está libre | — |

### `prisma/schema.prisma`

```prisma
enum SlotWaitlistStatus {
  WAITING
  OFFERED
  ACCEPTED
  DECLINED
  EXPIRED
}

model SlotWaitlistEntry {
  id             Int                @id @default(autoincrement())
  serviceId      Int
  startsAt       DateTime           @db.Timestamptz(3)
  clientName     String
  email          String
  link           String             @unique
  status         SlotWaitlistStatus @default(WAITING)
  offerExpiresAt DateTime?          @db.Timestamptz(3)
  createdAt      DateTime           @default(now()) @db.Timestamptz(3)

  service Service @relation(fields: [serviceId], references: [id])

  @@index([serviceId, startsAt])
}
```

En `model Service`: `slotWaitlist SlotWaitlistEntry[]`

### `src/infrastructure/slot-waitlist/slot-waitlist.dto.ts`

```ts
import { IsDateString, IsEmail, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class JoinSlotWaitlistDto {
  @IsInt()
  serviceId!: number;

  @IsDateString()
  startsAt!: string;

  @IsString()
  @IsNotEmpty()
  clientName!: string;

  @IsEmail()
  email!: string;
}
```

### `src/infrastructure/slot-waitlist/slot-waitlist.service.ts`

Los métodos `taken` y `offers` son de la consigna 5: si solo hacés esta, no los copies.

```ts
import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import {
  BOOKING_VERIFICATION_CODES,
  BookingVerificationCodes,
} from '../../domain/bookings/booking-verification-codes';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../domain/errors';
import { PrismaService } from '../prisma.service';
import { JoinSlotWaitlistDto } from './slot-waitlist.dto';

const OFFER_MINUTES = 15;

@Injectable()
export class SlotWaitlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createBooking: CreateBookingUseCase,
    @Inject(BOOKING_VERIFICATION_CODES) private readonly codes: BookingVerificationCodes,
  ) {}

  /** El horario tiene un Turno pendiente o aceptado. */
  private async isTaken(serviceId: number, startsAt: Date) {
    const count = await this.prisma.booking.count({
      where: { serviceId, startsAt, status: { in: ['PENDING', 'BOOKED'] } },
    });
    return count > 0;
  }

  /**
   * Procesa la lista de un horario (se llama al consultar o aceptar): vence las ofertas pasadas de los 15 minutos y,
   * si el horario está libre y nadie tiene una oferta vigente, se lo ofrece al primero que espera.
   */
  private async advance(serviceId: number, startsAt: Date) {
    const now = new Date();
    await this.prisma.slotWaitlistEntry.updateMany({
      where: { serviceId, startsAt, status: 'OFFERED', offerExpiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    if (startsAt <= now || (await this.isTaken(serviceId, startsAt))) return;
    const offered = await this.prisma.slotWaitlistEntry.count({
      where: { serviceId, startsAt, status: 'OFFERED' },
    });
    if (offered > 0) return;
    const next = await this.prisma.slotWaitlistEntry.findFirst({
      where: { serviceId, startsAt, status: 'WAITING' },
      orderBy: { createdAt: 'asc' },
    });
    if (next)
      await this.prisma.slotWaitlistEntry.update({
        where: { id: next.id },
        data: { status: 'OFFERED', offerExpiresAt: new Date(now.getTime() + OFFER_MINUTES * 60_000) },
      });
    // Sin nadie más en la lista, no se hace nada: el horario ya está libre, así que se ve disponible.
  }

  async join(dto: JoinSlotWaitlistDto) {
    const startsAt = new Date(dto.startsAt);
    if (!(await this.isTaken(dto.serviceId, startsAt)))
      throw new BusinessRuleError('Ese horario está libre: reservalo directamente');
    const entry = await this.prisma.slotWaitlistEntry.create({
      data: {
        serviceId: dto.serviceId,
        startsAt,
        clientName: dto.clientName,
        email: dto.email.toLowerCase(),
        link: randomBytes(16).toString('base64url'),
      },
    });
    return { link: entry.link };
  }

  async find(link: string) {
    const entry = await this.prisma.slotWaitlistEntry.findUnique({ where: { link } });
    if (!entry) throw new NotFoundError(`No hay una Anotación con el link ${link}`);
    await this.advance(entry.serviceId, entry.startsAt);
    return this.prisma.slotWaitlistEntry.findUniqueOrThrow({ where: { link } });
  }

  async accept(link: string) {
    const entry = await this.find(link); // si venció, acá queda EXPIRED y pasa al siguiente
    if (entry.status === 'EXPIRED')
      throw new BusinessRuleError('La oferta venció: se la ofrecimos a la siguiente persona de la lista');
    if (entry.status !== 'OFFERED')
      throw new BusinessRuleError(`No tenés una oferta vigente (la Anotación está ${entry.status})`);

    // El link de la Anotación es la credencial, como el Enlace del Turno: el código se pide acá adentro.
    const booking = await this.createBooking.execute({
      serviceId: entry.serviceId,
      startsAt: entry.startsAt,
      clientName: entry.clientName,
      clientEmail: entry.email,
      code: this.codes.request(entry.email),
    });
    await this.prisma.slotWaitlistEntry.update({ where: { id: entry.id }, data: { status: 'ACCEPTED' } });
    return { bookingLink: booking.link };
  }

  async decline(link: string) {
    const entry = await this.find(link);
    if (entry.status !== 'OFFERED' && entry.status !== 'WAITING')
      throw new BusinessRuleError(`La Anotación ya está ${entry.status}`);
    await this.prisma.slotWaitlistEntry.update({ where: { id: entry.id }, data: { status: 'DECLINED' } });
    await this.advance(entry.serviceId, entry.startsAt);
    return { status: 'DECLINED' };
  }

  // --- Para la consigna 5 (vista del Cliente) ---

  /** Los horarios ocupados de un Servicio en un día (`YYYY-MM-DD`, hora argentina). */
  async taken(serviceId: number, date: string) {
    const from = new Date(`${date}T00:00:00-03:00`);
    const bookings = await this.prisma.booking.findMany({
      where: {
        serviceId,
        status: { in: ['PENDING', 'BOOKED'] },
        startsAt: { gte: from, lt: new Date(from.getTime() + 86_400_000) },
      },
      select: { startsAt: true },
      distinct: ['startsAt'],
      orderBy: { startsAt: 'asc' },
    });
    return bookings.map(({ startsAt }) => ({ id: startsAt.toISOString(), startsAt }));
  }

  /** Mis ofertas: las vigentes de ese email, después de procesar sus listas. */
  async offers(email: string) {
    const mine = { email: email.toLowerCase() };
    const entries = await this.prisma.slotWaitlistEntry.findMany({
      where: { ...mine, status: { in: ['WAITING', 'OFFERED'] } },
    });
    for (const entry of entries) await this.advance(entry.serviceId, entry.startsAt);
    return this.prisma.slotWaitlistEntry.findMany({
      where: { ...mine, status: 'OFFERED' },
      include: { service: { select: { name: true } } },
      orderBy: { offerExpiresAt: 'asc' },
    });
  }

  /** Para `POST /bookings`: mientras hay una oferta vigente, el horario es solo de esa persona. */
  async assertNotOffered(serviceId: number, startsAt: Date, email: string) {
    await this.advance(serviceId, startsAt);
    const offer = await this.prisma.slotWaitlistEntry.findFirst({
      where: { serviceId, startsAt, status: 'OFFERED' },
    });
    if (offer && offer.email !== email.toLowerCase())
      throw new ConflictError('Ese horario está reservado unos minutos para la lista de espera');
  }
}
```

### `src/infrastructure/slot-waitlist/slot-waitlist.controller.ts`

```ts
import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { JoinSlotWaitlistDto } from './slot-waitlist.dto';
import { SlotWaitlistService } from './slot-waitlist.service';

// Todo sin Sesión: el link de la Anotación es la credencial.
@Controller('slot-waitlist')
export class SlotWaitlistController {
  constructor(private readonly waitlist: SlotWaitlistService) {}

  @Post()
  join(@Body() dto: JoinSlotWaitlistDto) {
    return this.waitlist.join(dto);
  }

  // Consigna 5. Van antes de `:link` para que Nest no los tome como un link.
  @Get('taken')
  taken(@Query('serviceId', ParseIntPipe) serviceId: number, @Query('date') date: string) {
    return this.waitlist.taken(serviceId, date);
  }

  @Get('offers')
  offers(@Query('email') email: string) {
    return this.waitlist.offers(email);
  }

  @Get(':link')
  find(@Param('link') link: string) {
    return this.waitlist.find(link);
  }

  @Post(':link/accept')
  accept(@Param('link') link: string) {
    return this.waitlist.accept(link);
  }

  @Post(':link/decline')
  decline(@Param('link') link: string) {
    return this.waitlist.decline(link);
  }
}
```

### Conectarlo

1. `SlotWaitlistController` y `SlotWaitlistService` en `BookingsModule` (ver "Antes de empezar").
2. En `src/infrastructure/bookings/bookings.controller.ts`, inyectá el servicio y llamalo al principio de `create`:

```ts
constructor(
  // ...los que ya están
  private readonly slotWaitlist: SlotWaitlistService,
) {}

@Post('bookings')
async create(@Body() dto: CreateBookingDto) {
  await this.slotWaitlist.assertNotOffered(dto.serviceId, new Date(dto.startsAt), dto.clientEmail);
  // ...lo que ya estaba
}
```

### Probar en Postman

Necesitás un Turno futuro aceptado (el "tomado"). Sacá su `serviceId`, `startsAt` y `link` con:
`SELECT id, link, "serviceId", "startsAt" FROM "Booking" WHERE status = 'BOOKED' AND "startsAt" > now() + interval '1 day';`

| Request | Esperado |
|---|---|
| `POST /slot-waitlist` `{ "serviceId": <id>, "startsAt": "<startsAt>", "clientName": "Ana", "email": "ana@a.com" }` | 201 `{ link }` (A) |
| Lo mismo con `"Beto"`, `beto@a.com` | 201 `{ link }` (B) |
| `GET /slot-waitlist/<link A>` | `status: WAITING`: el horario sigue tomado |
| `PATCH /booking-links/<link del Turno>/cancel` `{}` | 200: se liberó |
| `GET /slot-waitlist/<link A>` | `status: OFFERED`, `offerExpiresAt` a 15 min |
| `POST /bookings` con ese horario y otro email | **409** "Ese horario está reservado unos minutos para la lista de espera" |
| Vencé la oferta: `UPDATE "SlotWaitlistEntry" SET "offerExpiresAt" = now() - interval '1 minute' WHERE link = '<link A>';` | — |
| **`POST /slot-waitlist/<link A>/accept`** | **422 "La oferta venció: se la ofrecimos a la siguiente persona de la lista"** |
| `GET /slot-waitlist/<link B>` | `status: OFFERED`: pasó al siguiente |
| `POST /slot-waitlist/<link B>/accept` | 201 `{ bookingLink }`: B tiene el Turno |
| (Variante) Sin B en la lista, después del 422 | `GET /services/<id>/slots?...` vuelve a mostrar el horario |

### Qué deja afuera

- **Avisos:** no se manda mail con la oferta (la consigna no lo pide). El Cliente la ve consultando su link o en "Mis ofertas" (consigna 5).
- **Los 15 minutos arrancan al consultar**, no en el instante en que se canceló el Turno: es lo que implica "se procesa al consultar".
- **Servicios con varios Empleados:** "tomado" es "hay un Turno del Servicio a esa hora", aunque otro Empleado esté libre.

---

## 1. Paquetes de sesiones (back)

### Decisiones

| Pregunta | Decisión | Por qué |
|---|---|---|
| ¿Cómo identifica el Cliente su paquete? | Con un **código** de 8 caracteres que le da el Dueño | El Cliente no tiene Sesión: el código es la credencial |
| ¿Cuándo "usa" el paquete? | Recién reservado, con el Enlace del Turno: `POST /packs/<código>/use { link }` | Para no tocar `POST /bookings` |
| ¿Cuál es "la política del establecimiento"? | Constante: cancelar **24 h antes o más** devuelve la sesión | — |
| ¿Dónde se guarda el contador? | **No se guarda: se calcula.** `restantes = sesiones − Turnos del paquete que la consumen` | Así no hay que tocar Cancelar ni Ausencia: un Turno cancelado a tiempo deja de contar solo |
| ¿El Dueño ve la lista de paquetes vendidos? | No | La consigna solo pide que pueda venderlos |

Cuándo un Turno **consume** una sesión:

| Estado del Turno | ¿Consume? |
|---|---|
| `PENDING` / `BOOKED` (futuro, atendido o con Ausencia del Invitado) | Sí. La Ausencia no cambia `status`, así que el que no se presenta pierde la sesión sin código extra |
| `CANCELLED` por el Cliente con 24 h o más de anticipación | No: se devuelve |
| `CANCELLED` por el Cliente con menos de 24 h | Sí: se pierde |
| `CANCELLED` por el Negocio, o `REJECTED` | No: no fue culpa del Cliente |

### `prisma/schema.prisma`

```prisma
model SessionPack {
  id          Int      @id @default(autoincrement())
  code        String   @unique
  serviceId   Int
  clientEmail String
  sessions    Int
  expiresAt   DateTime @db.Timestamptz(3)
  createdAt   DateTime @default(now()) @db.Timestamptz(3)

  service  Service   @relation(fields: [serviceId], references: [id])
  bookings Booking[]
}
```

En `model Booking`:

```prisma
  packId Int?
  pack   SessionPack? @relation(fields: [packId], references: [id])
```

En `model Service`: `sessionPacks SessionPack[]`

### `src/infrastructure/packs/packs.dto.ts`

```ts
import { IsDateString, IsEmail, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreatePackDto {
  @IsInt()
  serviceId!: number;

  @IsInt()
  @Min(1)
  @Max(50)
  sessions!: number;

  @IsDateString()
  expiresAt!: string;

  @IsEmail()
  clientEmail!: string;
}

export class UsePackDto {
  /** El Enlace del Turno que se paga con el paquete. */
  @IsString()
  @IsNotEmpty()
  link!: string;
}
```

### `src/infrastructure/packs/packs.service.ts`

```ts
import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import { PrismaService } from '../prisma.service';
import { CreatePackDto, UsePackDto } from './packs.dto';

/** Política del establecimiento: cancelar con al menos estas horas devuelve la sesión. */
const REFUND_HOURS = 24;

type PackBooking = { status: string; startsAt: Date; cancelledAt: Date | null; cancelledBy: string | null };

/** Si este Turno se come una sesión del paquete. */
function consumesSession(b: PackBooking): boolean {
  if (b.status === 'REJECTED') return false;
  if (b.status !== 'CANCELLED') return true; // pendiente, aceptado, atendido o con Ausencia (no se presentó)
  if (b.cancelledBy !== 'CLIENT') return false; // lo canceló el Negocio
  const hoursBefore = (b.startsAt.getTime() - b.cancelledAt!.getTime()) / 3_600_000;
  return hoursBefore < REFUND_HOURS; // canceló tarde: la pierde
}

@Injectable()
export class PacksService {
  constructor(private readonly prisma: PrismaService) {}

  /** El paquete con las sesiones que le quedan, calculadas de sus Turnos. */
  private async load(code: string) {
    const pack = await this.prisma.sessionPack.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: { bookings: { select: { status: true, startsAt: true, cancelledAt: true, cancelledBy: true } } },
    });
    if (!pack) throw new NotFoundError(`No existe un paquete con el código ${code}`);
    const { bookings, ...rest } = pack;
    return { ...rest, remaining: pack.sessions - bookings.filter(consumesSession).length };
  }

  /** Vender un paquete de un Servicio del Dueño. El pago es simulado: se crea y listo. */
  async create(userId: number, dto: CreatePackDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, deletedAt: null, OR: [{ userId }, { branch: { business: { ownerId: userId } } }] },
    });
    if (!service) throw new NotFoundError(`No tenés un servicio con id ${dto.serviceId}`);
    return this.prisma.sessionPack.create({
      data: {
        code: randomBytes(4).toString('hex').toUpperCase(),
        serviceId: dto.serviceId,
        sessions: dto.sessions,
        expiresAt: new Date(dto.expiresAt),
        clientEmail: dto.clientEmail,
      },
    });
  }

  find(code: string) {
    return this.load(code);
  }

  /** Pagar con el paquete el Turno recién reservado: pasa a contar, así que descuenta una sesión. */
  async use(code: string, dto: UsePackDto) {
    const booking = await this.prisma.booking.findUnique({ where: { link: dto.link } });
    if (!booking) throw new NotFoundError('No encontramos el Turno');
    if (!['PENDING', 'BOOKED'].includes(booking.status) || booking.startsAt <= new Date())
      throw new BusinessRuleError('Solo se puede usar un paquete en un Turno pendiente o aceptado que no empezó');
    if (booking.packId) throw new BusinessRuleError('Este Turno ya usa un paquete');

    const pack = await this.load(code);
    if (pack.serviceId !== booking.serviceId) throw new BusinessRuleError('El paquete es de otro servicio');
    if (pack.expiresAt <= new Date())
      throw new BusinessRuleError(`El paquete venció el ${pack.expiresAt.toLocaleDateString('es-AR')}`);
    if (pack.remaining <= 0)
      throw new BusinessRuleError(`El paquete no tiene sesiones restantes (usó ${pack.sessions} de ${pack.sessions})`);

    await this.prisma.booking.update({ where: { id: booking.id }, data: { packId: pack.id } });
    return { remaining: pack.remaining - 1 };
  }
}
```

### `src/infrastructure/packs/packs.controller.ts`

```ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { CreatePackDto, UsePackDto } from './packs.dto';
import { PacksService } from './packs.service';

@Controller('packs')
export class PacksController {
  constructor(private readonly packs: PacksService) {}

  // El Dueño vende
  @Post()
  @UseGuards(ClerkGuard)
  create(@CurrentUser() userId: number, @Body() dto: CreatePackDto) {
    return this.packs.create(userId, dto);
  }

  // El Cliente, sin Sesión: el código es la credencial
  @Get(':code')
  find(@Param('code') code: string) {
    return this.packs.find(code);
  }

  @Post(':code/use')
  use(@Param('code') code: string, @Body() dto: UsePackDto) {
    return this.packs.use(code, dto);
  }
}
```

### `src/infrastructure/packs/packs.module.ts`

```ts
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PacksController } from './packs.controller';
import { PacksService } from './packs.service';

@Module({
  imports: [UsersModule],
  controllers: [PacksController],
  providers: [PacksService],
})
export class PacksModule {}
```

Y `PacksModule` en los `imports` de `infrastructure.module.ts`.

### Probar en Postman (`Authorization: Bearer dev:user_offline` en el del Dueño)

Usá dos Turnos **futuros, a más de 24 h**, del mismo Servicio de `user_offline` (A y B):
`SELECT id, link, "serviceId", "startsAt" FROM "Booking" WHERE status IN ('PENDING','BOOKED') AND "startsAt" > now() + interval '1 day' ORDER BY "serviceId";`

| Request | Esperado |
|---|---|
| `POST /packs` `{ "serviceId": <id>, "sessions": 1, "expiresAt": "2026-12-31T23:59:59-03:00", "clientEmail": "a@a.com" }` | 201 con `code` |
| `POST /packs/<code>/use` `{ "link": "<link A>" }` | 201 `{ remaining: 0 }` |
| **`POST /packs/<code>/use` `{ "link": "<link B>" }`** | **422 "El paquete no tiene sesiones restantes (usó 1 de 1)"** |
| `PATCH /booking-links/<link A>/cancel` `{}` | 200 |
| `GET /packs/<code>` | **`remaining: 1`: el contador volvió a subir** |
| `POST /packs/<code>/use` con un Turno de otro Servicio | 422 "El paquete es de otro servicio" |
| Vencelo: `UPDATE "SessionPack" SET "expiresAt" = now() - interval '1 day' WHERE code = '<code>';` y reintentá con B | **422 "El paquete venció el ..."** |

### Qué deja afuera

- **Reagendar:** el Turno nuevo no hereda `packId`. Para cubrirlo, en `consumesSession` devolvé `false` si el Turno tiene `rescheduled: true` y que el Cliente use el código otra vez.
- **Seña:** un Turno pagado con paquete sigue pidiendo la Seña si el Servicio la tiene.
- **Carrera:** dos usos simultáneos de un paquete con 1 sesión podrían pasar los dos. En producción va en una transacción.

---

## 2. Ausencia de un profesional con turnos tomados (back)

### Decisiones

| Pregunta | Decisión | Por qué |
|---|---|---|
| ¿Cómo se carga la Ausencia "igual"? | Endpoint propio, `POST /absences`, que crea el `OutOfOffice` con Prisma | El `POST /users/me/out-of-office` que ya existe cancela los Turnos que pisa, y la consigna no quiere eso |
| Estado "requiere reprogramación" | Una columna `needsReschedule` en el Turno, que sigue `BOOKED` | Un valor nuevo en el enum `BookingStatus` obliga a tocar todo el código que lo recorre. `GET` lo muestra como `REQUIERE_REPROGRAMACION` |
| ¿Cómo se busca "el primer horario libre, con el mismo profesional u otro"? | `ListSlotsUseCase`, que ya junta los horarios de todos los Empleados del Servicio y descuenta las Ausencias | No reescribir el cálculo de horarios |
| Aceptar la propuesta | El Reagendar de siempre (`RescheduleBookingByLinkUseCase`): valida que el horario siga libre y elige Empleado | Ya tira error si el horario se ocupó |
| Devolver la Seña | La respuesta dice cuánto se devuelve (`refundedDeposit`) | La Seña es simbólica: Agendic no cobra |

### `prisma/schema.prisma`

En `model Booking`:

```prisma
  needsReschedule  Boolean   @default(false)
  proposedStartsAt DateTime? @db.Timestamptz(3)
```

### `src/infrastructure/absences/absences.dto.ts`

```ts
import { Matches } from 'class-validator';

export class CreateAbsenceDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate tiene que ser YYYY-MM-DD' })
  startDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate tiene que ser YYYY-MM-DD' })
  endDate!: string;
}
```

### `src/infrastructure/absences/absences.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { RescheduleBookingByLinkUseCase } from '../../application/bookings/reschedule-booking-by-link.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { BadRequestError, BusinessRuleError, ConflictError, NotFoundError } from '../../domain/errors';
import { PrismaService } from '../prisma.service';
import { CreateAbsenceDto } from './absences.dto';

const ymd = (date: Date) => date.toISOString().slice(0, 10);
const fmt = (date: Date | null) =>
  date ? date.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : 'ninguna en los próximos 30 días';

@Injectable()
export class AbsencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listSlots: ListSlotsUseCase,
    private readonly reschedule: RescheduleBookingByLinkUseCase,
  ) {}

  /** El primer Horario reservable del Servicio desde ahora, con cualquier Empleado que lo Ofrezca. */
  private async firstFreeSlot(serviceId: number): Promise<Date | null> {
    const now = new Date();
    const { days } = await this.listSlots.execute(serviceId, ymd(now), ymd(new Date(now.getTime() + 30 * 86_400_000)));
    const first = days.flatMap((day) => day.slots)[0];
    return first ? new Date(first) : null;
  }

  /** Carga la Ausencia aunque pise Turnos: los aceptados pasan a requerir reprogramación, con una propuesta cada uno. */
  async create(userId: number, dto: CreateAbsenceDto) {
    const from = new Date(`${dto.startDate}T00:00:00-03:00`);
    const to = new Date(`${dto.endDate}T23:59:59-03:00`);
    if (to < from) throw new BadRequestError('endDate no puede ser anterior a startDate');

    // Directo con Prisma, sin el caso de uso de Fuera de la oficina: ese cancela los Turnos que pisa.
    await this.prisma.outOfOffice.create({
      data: { userId, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), reason: 'UNSPECIFIED' },
    });
    const affected = await this.prisma.booking.findMany({
      where: { userId, status: 'BOOKED', startsAt: { gte: from, lte: to } },
    });
    for (const booking of affected) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { needsReschedule: true, proposedStartsAt: await this.firstFreeSlot(booking.serviceId) },
      });
    }
    return { affected: affected.length };
  }

  private async load(link: string) {
    const booking = await this.prisma.booking.findUnique({ where: { link } });
    if (!booking) throw new NotFoundError('No encontramos el Turno');
    if (!booking.needsReschedule || booking.status !== 'BOOKED')
      throw new NotFoundError('Este Turno no requiere reprogramación');
    return booking;
  }

  async find(link: string) {
    const booking = await this.load(link);
    return { status: 'REQUIERE_REPROGRAMACION', startsAt: booking.startsAt, proposedStartsAt: booking.proposedStartsAt };
  }

  /** Acepta la propuesta con el Reagendar de siempre; si el horario ya no está libre, genera otra y avisa. */
  async accept(link: string) {
    const booking = await this.load(link);
    if (!booking.proposedStartsAt) throw new BusinessRuleError('No hay horarios libres en los próximos 30 días');
    try {
      await this.reschedule.execute(link, booking.proposedStartsAt); // el Enlace pasa al Turno nuevo
    } catch (error) {
      if (!(error instanceof ConflictError || error instanceof BusinessRuleError)) throw error;
      const next = await this.firstFreeSlot(booking.serviceId);
      await this.prisma.booking.update({ where: { id: booking.id }, data: { proposedStartsAt: next } });
      throw new ConflictError(`El horario propuesto ya no está libre. Nueva propuesta: ${fmt(next)}`);
    }
    return { status: 'REPROGRAMADO' };
  }

  /** Cancela y devuelve la Seña completa, sin mirar la política. */
  async cancel(link: string) {
    const booking = await this.load(link);
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: 'CLIENT', needsReschedule: false },
    });
    return { status: 'CANCELLED', refundedDeposit: booking.depositPaidAt ? booking.depositAmount : 0 };
  }
}
```

### `src/infrastructure/absences/absences.controller.ts`

```ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { CreateAbsenceDto } from './absences.dto';
import { AbsencesService } from './absences.service';

@Controller()
export class AbsencesController {
  constructor(private readonly absences: AbsencesService) {}

  // El profesional
  @Post('absences')
  @UseGuards(ClerkGuard)
  create(@CurrentUser() userId: number, @Body() dto: CreateAbsenceDto) {
    return this.absences.create(userId, dto);
  }

  // El Cliente, por el Enlace del Turno
  @Get('reschedule-proposals/:link')
  find(@Param('link') link: string) {
    return this.absences.find(link);
  }

  @Post('reschedule-proposals/:link/accept')
  accept(@Param('link') link: string) {
    return this.absences.accept(link);
  }

  @Post('reschedule-proposals/:link/cancel')
  cancel(@Param('link') link: string) {
    return this.absences.cancel(link);
  }
}
```

Y `AbsencesController` y `AbsencesService` en `BookingsModule`.

### Probar en Postman

Usá un Servicio con **un solo Empleado** (si tiene dos, el horario puede seguir libre con el otro) y un Turno
aceptado suyo de mañana (T). Entrá como ese Empleado.

| Request | Esperado |
|---|---|
| `POST /absences` `{ "startDate": "<día de T>", "endDate": "<día de T>" }` (con Sesión) | 201 `{ affected: 1 }` |
| `GET /reschedule-proposals/<link de T>` | `status: REQUIERE_REPROGRAMACION` y `proposedStartsAt` (P) |
| Tomá P con otra reserva: `POST /bookings` `{ "serviceId": <id>, "startsAt": "<P>", "clientName": "Otro", "clientEmail": "otro@a.com", "code": "AAAAAA" }` | 201 |
| **`POST /reschedule-proposals/<link de T>/accept`** | **409 "El horario propuesto ya no está libre. Nueva propuesta: ..."** |
| `GET /reschedule-proposals/<link de T>` | `proposedStartsAt` cambió: es el siguiente horario libre |
| `POST /reschedule-proposals/<link de T>/accept` | 201 `{ status: REPROGRAMADO }` |
| (Otro Turno afectado) `POST /reschedule-proposals/<link>/cancel` | 201 `{ status: CANCELLED, refundedDeposit }` |

### Qué deja afuera

- **Zona horaria:** los días de la Ausencia se leen en hora argentina (`-03:00`), no en la de la Sucursal.
- **Turnos pendientes:** solo pasan a "requiere reprogramación" los aceptados (`BOOKED`), que es lo que dice la consigna ("confirmados").
- **Avisos:** no se manda mail con la propuesta.

---

## 3. Penalización por no presentarse (back)

### Decisiones

| Pregunta | Decisión | Por qué |
|---|---|---|
| ¿Quién es "el administrador"? | El Dueño del Negocio | Es el único rol que administra el Negocio |
| "Configurable por establecimiento" | Una fila `PenaltyPolicy` por Negocio; si no hay, 100 % y 60 días | Columnas nuevas en `Business` rompen el repositorio de Negocios, que arma el objeto campo por campo |
| Perdonar | `noShowForgivenAt` en el Turno: la Ausencia queda, pero no cuenta | "Desmarcar" la Ausencia (`DELETE /bookings/:id/no-show`) borraría que pasó |
| ¿Cómo se identifica al Cliente? | Por el email del `Client` del Turno | El Cliente no tiene cuenta |
| ¿Dónde se aplica "al reservar"? | En `BookingsController.create`, después de crear el Turno: si corresponde, pisa `depositAmount` | No tocar `CreateBookingUseCase` |
| Servicios personales | Sin penalización | No tienen establecimiento |

### `prisma/schema.prisma`

```prisma
model PenaltyPolicy {
  businessId Int @id
  percent    Int @default(100)
  windowDays Int @default(60)

  business Business @relation(fields: [businessId], references: [id])
}
```

En `model Business`: `penaltyPolicy PenaltyPolicy?`

En `model Booking`: `noShowForgivenAt DateTime? @db.Timestamptz(3)`

### `src/infrastructure/penalties/penalties.dto.ts`

```ts
import { IsInt, Max, Min } from 'class-validator';

export class PenaltyPolicyDto {
  @IsInt()
  @Min(0)
  @Max(100)
  percent!: number;

  @IsInt()
  @Min(1)
  @Max(365)
  windowDays!: number;
}
```

### `src/infrastructure/penalties/penalties.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../domain/errors';
import { PrismaService } from '../prisma.service';
import { PenaltyPolicyDto } from './penalties.dto';

/** Desde cuántas Ausencias sin perdonar se penaliza. */
const MIN_NO_SHOWS = 2;
/** Lo que vale para un Negocio que nunca configuró su política. */
const DEFAULT_POLICY = { percent: 100, windowDays: 60 };

@Injectable()
export class PenaltiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** El Dueño configura el porcentaje y la ventana de su Negocio. */
  async setPolicy(userId: number, dto: PenaltyPolicyDto) {
    const business = await this.prisma.business.findUnique({ where: { ownerId: userId } });
    if (!business) throw new ForbiddenError('Solo el Dueño de un Negocio configura la penalización');
    return this.prisma.penaltyPolicy.upsert({
      where: { businessId: business.id },
      create: { businessId: business.id, ...dto },
      update: dto,
    });
  }

  /** El Dueño perdona la Ausencia del Invitado de un Turno de su Negocio: deja de contar. */
  async forgive(userId: number, bookingId: number) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, service: { branch: { business: { ownerId: userId } } } },
    });
    if (!booking) throw new NotFoundError(`No hay un Turno ${bookingId} en tu Negocio`);
    if (!booking.noShowAt) throw new BusinessRuleError(`El Turno ${bookingId} no tiene Ausencia del Invitado`);
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { noShowForgivenAt: new Date() },
      select: { id: true, noShowAt: true, noShowForgivenAt: true },
    });
  }

  /**
   * Se llama al reservar, con el Turno recién creado: si su Cliente tiene 2 o más Ausencias sin perdonar en la
   * ventana del Negocio, la Seña pasa a ser el porcentaje de penalización. Devuelve la Seña que quedó.
   */
  async apply(bookingId: number) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        client: true,
        service: { select: { branch: { select: { businessId: true, business: { select: { penaltyPolicy: true } } } } } },
      },
    });
    const branch = booking.service.branch;
    if (!branch || !booking.client) return booking.depositAmount; // Servicio personal: sin penalización
    const policy = branch.business.penaltyPolicy ?? DEFAULT_POLICY;

    const noShows = await this.prisma.booking.count({
      where: {
        client: { is: { email: booking.client.email } },
        noShowAt: { not: null },
        noShowForgivenAt: null,
        startsAt: { gte: new Date(Date.now() - policy.windowDays * 86_400_000) },
        service: { branch: { businessId: branch.businessId } },
      },
    });
    if (noShows < MIN_NO_SHOWS) return booking.depositAmount;

    const deposit = booking.price.mul(policy.percent).div(100).toDecimalPlaces(2);
    await this.prisma.booking.update({ where: { id: bookingId }, data: { depositAmount: deposit } });
    return deposit;
  }
}
```

### `src/infrastructure/penalties/penalties.controller.ts`

```ts
import { Body, Controller, Param, ParseIntPipe, Patch, Put, UseGuards } from '@nestjs/common';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { PenaltyPolicyDto } from './penalties.dto';
import { PenaltiesService } from './penalties.service';

@Controller('penalties')
@UseGuards(ClerkGuard)
export class PenaltiesController {
  constructor(private readonly penalties: PenaltiesService) {}

  @Put('policy')
  setPolicy(@CurrentUser() userId: number, @Body() dto: PenaltyPolicyDto) {
    return this.penalties.setPolicy(userId, dto);
  }

  @Patch('bookings/:id/forgive')
  forgive(@CurrentUser() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.penalties.forgive(userId, id);
  }
}
```

### Conectarlo

1. `PenaltiesController` y `PenaltiesService` en `BookingsModule`.
2. En `bookings.controller.ts`, inyectá `PenaltiesService` y devolvé la Seña que quedó (en la rama sin `repeat`):

```ts
const booking = await this.createBookingUseCase.execute(input);
return {
  ...presentBooking(booking),
  employeeName: booking.employeeName,
  link: booking.link,
  depositAmount: await this.penalties.apply(booking.id),
};
```

### Probar en Postman

Usá un Servicio del Negocio de `user_offline` con Seña del 30 % y precio 1000.

| Request | Esperado |
|---|---|
| Dos Turnos pasados de `cli@a.com` en ese Negocio, marcados como no presentados: `UPDATE "Booking" SET "noShowAt" = now() WHERE id IN (<id1>, <id2>);` | — |
| **`POST /bookings`** `{ ..., "clientEmail": "cli@a.com", "code": "AAAAAA" }` | **`depositAmount: "1000"`: 100 %** |
| `PATCH /penalties/bookings/<id1>/forgive` (Dueño) | 200 con `noShowForgivenAt` |
| **`POST /bookings`** otra vez, otro horario | **`depositAmount: "300"`: el 30 % normal** |
| `PUT /penalties/policy` `{ "percent": 50, "windowDays": 30 }` (Dueño) | 200: el Negocio penaliza con 50 % mirando 30 días |

### Qué deja afuera

- **El mail de Confirmación** sale con la Seña normal: se manda adentro del caso de uso, antes de penalizar.
- **Series (`repeat`):** no se penalizan; habría que llamar a `apply` por cada Turno de `booked.series`.

---

## 4. Reserva temporal durante la confirmación (back)

### Decisiones

| Pregunta | Decisión | Por qué |
|---|---|---|
| ¿Cómo se identifica al Cliente? | Por email | Todavía no reservó: no tiene Enlace |
| Una retención por Cliente | `clientEmail @unique` + `upsert`: crear otra pisa la anterior | La base garantiza la regla |
| Un horario, una retención | `@@unique([serviceId, startsAt])` y un 409 claro antes | — |
| "No aparece disponible para otros" | `GET /holds/slots`: los horarios de siempre menos los retenidos por otros | No tocar `ListSlotsUseCase` |
| "Pendiente de seña" | El Turno que crea `CreateBookingUseCase` con `depositAmount` y sin `depositPaidAt`: así se llama la Seña pendiente en el glosario | No hay que agregar estados |
| Confirmar | Con el nombre y el código de siempre | Es una reserva normal |

### `prisma/schema.prisma`

```prisma
model Hold {
  id          Int      @id @default(autoincrement())
  serviceId   Int
  startsAt    DateTime @db.Timestamptz(3)
  clientEmail String   @unique
  expiresAt   DateTime @db.Timestamptz(3)

  service Service @relation(fields: [serviceId], references: [id])

  @@unique([serviceId, startsAt])
}
```

En `model Service`: `holds Hold[]`

### `src/infrastructure/holds/holds.dto.ts`

```ts
import { IsDateString, IsEmail, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateHoldDto {
  @IsInt()
  serviceId!: number;

  @IsDateString()
  startsAt!: string;

  @IsEmail()
  clientEmail!: string;
}

export class ConfirmHoldDto {
  @IsString()
  @IsNotEmpty()
  clientName!: string;

  /** El Código de verificación de siempre (`POST /bookings/code`). */
  @IsString()
  code!: string;
}
```

### `src/infrastructure/holds/holds.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { CreateBookingUseCase } from '../../application/bookings/create-booking.use-case';
import { ListSlotsUseCase } from '../../application/slots/list-slots.use-case';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../domain/errors';
import { PrismaService } from '../prisma.service';
import { ConfirmHoldDto, CreateHoldDto } from './holds.dto';

const HOLD_MINUTES = 10;

@Injectable()
export class HoldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listSlots: ListSlotsUseCase,
    private readonly createBooking: CreateBookingUseCase,
  ) {}

  /** Borra las retenciones vencidas: así se procesa el vencimiento, sin tarea programada. */
  private clean() {
    return this.prisma.hold.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  }

  /** Los Horarios reservables de siempre, sin los que retuvo otro Cliente. */
  async slots(serviceId: number, from: string, to: string, email = '') {
    await this.clean();
    const [{ timeZone, days }, holds] = await Promise.all([
      this.listSlots.execute(serviceId, from, to),
      this.prisma.hold.findMany({ where: { serviceId, clientEmail: { not: email.toLowerCase() } } }),
    ]);
    const held = new Set(holds.map((hold) => hold.startsAt.toISOString()));
    return { timeZone, days: days.map((day) => ({ ...day, slots: day.slots.filter((slot) => !held.has(slot)) })) };
  }

  /** Retiene el horario 10 minutos. Si el Cliente ya tenía otra retención, esta la reemplaza (se libera la anterior). */
  async create(dto: CreateHoldDto) {
    await this.clean();
    const email = dto.clientEmail.toLowerCase();
    const startsAt = new Date(dto.startsAt);
    const taken = await this.prisma.hold.findUnique({
      where: { serviceId_startsAt: { serviceId: dto.serviceId, startsAt } },
    });
    if (taken && taken.clientEmail !== email) throw new ConflictError('Ese horario lo está reservando otro Cliente');
    const data = { serviceId: dto.serviceId, startsAt, expiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000) };
    return this.prisma.hold.upsert({ where: { clientEmail: email }, create: { ...data, clientEmail: email }, update: data });
  }

  /** Convierte la retención en un Turno con la Seña pendiente. */
  async confirm(id: number, dto: ConfirmHoldDto) {
    const hold = await this.prisma.hold.findUnique({ where: { id } });
    if (!hold) throw new NotFoundError(`No hay una retención ${id}: venció o se reemplazó por otra`);
    if (hold.expiresAt <= new Date()) {
      await this.prisma.hold.delete({ where: { id } });
      throw new BusinessRuleError('La retención venció: pasaron más de 10 minutos y el horario volvió a estar disponible');
    }
    const booking = await this.createBooking.execute({
      serviceId: hold.serviceId,
      startsAt: hold.startsAt,
      clientName: dto.clientName,
      clientEmail: hold.clientEmail,
      code: dto.code,
    });
    await this.prisma.hold.delete({ where: { id } });
    return {
      link: booking.link,
      status: booking.depositAmount && !booking.depositPaidAt ? 'PENDIENTE_DE_SENA' : booking.status,
      depositAmount: booking.depositAmount,
    };
  }
}
```

### `src/infrastructure/holds/holds.controller.ts`

```ts
import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ConfirmHoldDto, CreateHoldDto } from './holds.dto';
import { HoldsService } from './holds.service';

@Controller('holds')
export class HoldsController {
  constructor(private readonly holds: HoldsService) {}

  /** `GET /holds/slots?serviceId=1&from=2026-12-01&to=2026-12-07&email=yo@a.com` */
  @Get('slots')
  slots(
    @Query('serviceId', ParseIntPipe) serviceId: number,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('email') email?: string,
  ) {
    return this.holds.slots(serviceId, from, to, email);
  }

  @Post()
  create(@Body() dto: CreateHoldDto) {
    return this.holds.create(dto);
  }

  @Post(':id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number, @Body() dto: ConfirmHoldDto) {
    return this.holds.confirm(id, dto);
  }
}
```

Y `HoldsController` y `HoldsService` en `BookingsModule`.

### Probar en Postman

Usá un Servicio **con Seña** y un horario libre H de `GET /services/<id>/slots?from=...&to=...`.

| Request | Esperado |
|---|---|
| `POST /holds` `{ "serviceId": <id>, "startsAt": "<H>", "clientEmail": "uno@a.com" }` | 201 con `id` (R1) |
| **`GET /holds/slots?serviceId=<id>&from=<día>&to=<día>&email=dos@a.com`** | **H no está** |
| `GET /holds/slots?...&email=uno@a.com` | H sí está (es suya) |
| `POST /holds` con H y `dos@a.com` | 409 "Ese horario lo está reservando otro Cliente" |
| Vencela: `UPDATE "Hold" SET "expiresAt" = now() - interval '1 minute' WHERE id = <R1>;` | — |
| **`POST /holds/<R1>/confirm`** `{ "clientName": "Uno", "code": "AAAAAA" }` | **422 "La retención venció: ... el horario volvió a estar disponible"** |
| `GET /holds/slots?...&email=dos@a.com` | H volvió |
| (A tiempo) `POST /holds` y enseguida `POST /holds/<id>/confirm` | 201 `{ link, status: PENDIENTE_DE_SENA, depositAmount }` |
| `POST /holds` de `uno@a.com` con otro horario | La retención anterior se liberó (H vuelve a aparecer para los demás) |

### Qué deja afuera

- **`POST /bookings` directo** no mira las retenciones: un Cliente que no pasa por `/holds` puede tomar un horario retenido. La consigna habla de lo que se *ve* disponible.
- **El `id` de la retención** funciona como credencial y es un número: en producción sería un secreto aleatorio.

---

## 5. Lista de espera, vista del cliente (front)

Usa el back de la consigna 0, más dos endpoints que ya están en el código de arriba: `GET /slot-waitlist/taken`
(horarios ocupados de un día) y `GET /slot-waitlist/offers?email=` (Mis ofertas).

### Decisiones

| Pregunta | Decisión | Por qué |
|---|---|---|
| "En la pantalla de reserva" | Una pantalla propia, `/lista-de-espera/ocupados`, con los horarios ocupados del Servicio y el día | La pantalla de reserva real solo recibe horarios libres; meterle los ocupados es mucho más código |
| ¿Cómo sabe el Cliente cuáles son "sus" ofertas? | Por email, en `/lista-de-espera/ofertas` | No tiene Sesión |
| "Desaparece sin recargar la página" | `<Expiring>` la esconde cuando llega a 0, y pide los datos de nuevo | — |
| Validación: aceptar una vencida | `ActionButton` con `refreshOnError`: muestra el mensaje del back en un toast y recarga, y como el back ya no la devuelve, la tarjeta se va | — |
| "Debe funcionar en el celular" | Una columna (`max-w-lg`) y los botones apilados hasta `sm:` | — |

| Punto de la consigna | Archivo | Componentes |
|---|---|---|
| Botón "Avisarme si se libera" en los ocupados | `app/lista-de-espera/ocupados/page.tsx` | `JsonForm` (`toUrl`), `DataTable`, `FormDialog` |
| "Mis ofertas" con cuenta regresiva | `app/lista-de-espera/ofertas/page.tsx` | `JsonForm` (`toUrl`), `Expiring`, `Countdown` |
| Aceptar o rechazar | la misma | `ActionButton` |

### `app/lista-de-espera/ocupados/actions.ts`

```ts
'use server';

import { back } from '@/app/_components/back';
import type { FormValues } from '@/app/_components/quick/JsonForm';

/** Anotarse a la lista de espera de un horario ocupado. `values` trae `clientName` y `email` del form. */
export async function anotarme(serviceId: number, startsAt: string, values: FormValues) {
    return back('POST', '/slot-waitlist', { body: { serviceId, startsAt, ...values } });
}
```

### `app/lista-de-espera/ocupados/page.tsx`

```tsx
import { AppToaster } from '@/app/_components/AppToaster';
import { back } from '@/app/_components/back';
import { DataTable } from '@/app/_components/quick/DataTable';
import { ErrorAlert } from '@/app/_components/quick/ErrorAlert';
import { FormDialog } from '@/app/_components/quick/FormDialog';
import { JsonForm } from '@/app/_components/quick/JsonForm';
import { anotarme } from './actions';

type Ocupado = { id: string; startsAt: string };

export default async function OcupadosPage({ searchParams }: { searchParams: Promise<{ serviceId?: string; date?: string }> }) {
    const { serviceId, date } = await searchParams;
    const result = serviceId && date ? await back<Ocupado[]>('GET', `/slot-waitlist/taken?serviceId=${serviceId}&date=${date}`) : null;

    return (
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 sm:p-6">
            <AppToaster />
            <h1 className="text-xl font-semibold">Horarios ocupados</h1>
            <JsonForm
                toUrl
                submitLabel="Ver horarios"
                fields={[
                    { name: 'serviceId', label: 'Servicio (id)', type: 'number', defaultValue: serviceId, required: 'Falta el Servicio' },
                    {
                        name: 'date',
                        label: 'Día',
                        type: 'date',
                        defaultValue: date,
                        required: 'Falta el día',
                        min: { value: 'today', message: 'Elegí hoy o un día que viene' },
                    },
                ]}
            />
            {result && !result.ok && <ErrorAlert message={result.message} />}
            {result?.ok && (
                <DataTable
                    rows={result.data}
                    empty="No hay horarios ocupados ese día"
                    columns={[
                        { label: 'Hora', key: 'startsAt', format: 'time' },
                        {
                            label: 'Lista de espera',
                            className: 'text-right',
                            cell: (ocupado) => (
                                <FormDialog
                                    trigger="Avisarme si se libera"
                                    title="Avisarme si se libera"
                                    description="Si se libera, te lo ofrecemos por 15 minutos. Lo ves en Mis ofertas."
                                    submitLabel="Anotarme"
                                    successMessage="Listo: te anotamos"
                                    action={anotarme.bind(null, Number(serviceId), ocupado.startsAt)}
                                    fields={[
                                        { name: 'clientName', label: 'Nombre', required: 'Falta tu nombre' },
                                        {
                                            name: 'email',
                                            label: 'Email',
                                            type: 'email',
                                            required: 'Falta tu email',
                                            pattern: { value: '^\\S+@\\S+\\.\\S+$', message: 'Ese email no es válido' },
                                        },
                                    ]}
                                />
                            ),
                        },
                    ]}
                />
            )}
        </main>
    );
}
```

### `app/lista-de-espera/ofertas/actions.ts`

```ts
'use server';

import { back } from '@/app/_components/back';

export async function aceptarOferta(link: string) {
    return back('POST', `/slot-waitlist/${link}/accept`);
}

export async function rechazarOferta(link: string) {
    return back('POST', `/slot-waitlist/${link}/decline`);
}
```

### `app/lista-de-espera/ofertas/page.tsx`

```tsx
import { AppToaster } from '@/app/_components/AppToaster';
import { back } from '@/app/_components/back';
import { ActionButton } from '@/app/_components/quick/ActionButton';
import { Countdown, Expiring } from '@/app/_components/quick/Countdown';
import { fmtDateTime } from '@/app/_components/quick/dates';
import { ErrorAlert } from '@/app/_components/quick/ErrorAlert';
import { JsonForm } from '@/app/_components/quick/JsonForm';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { Empty, EmptyHeader, EmptyTitle } from '@/app/_components/ui/empty';
import { aceptarOferta, rechazarOferta } from './actions';

type Oferta = { id: number; link: string; startsAt: string; offerExpiresAt: string; service: { name: string } };

export default async function MisOfertasPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
    const { email } = await searchParams;
    const result = email ? await back<Oferta[]>('GET', `/slot-waitlist/offers?email=${encodeURIComponent(email)}`) : null;

    return (
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 sm:p-6">
            <AppToaster />
            <h1 className="text-xl font-semibold">Mis ofertas</h1>
            <JsonForm
                toUrl
                submitLabel="Ver mis ofertas"
                fields={[{ name: 'email', label: 'Tu email', type: 'email', defaultValue: email, required: 'Falta tu email' }]}
            />

            {result && !result.ok && <ErrorAlert message={result.message} />}
            {result?.ok && result.data.length === 0 && (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>No tenés ofertas vigentes</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            )}
            {result?.ok &&
                result.data.map((oferta) => (
                    <Expiring key={oferta.id} until={oferta.offerExpiresAt}>
                        <Card>
                            <CardHeader>
                                <CardTitle>{oferta.service.name}</CardTitle>
                                <CardDescription>{fmtDateTime(oferta.startsAt)}</CardDescription>
                                <CardAction className="text-sm">
                                    Vence en <Countdown until={oferta.offerExpiresAt} />
                                </CardAction>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-2 sm:flex-row">
                                <ActionButton action={aceptarOferta.bind(null, oferta.link)} refreshOnError successMessage="¡Turno reservado!">
                                    Aceptar
                                </ActionButton>
                                <ActionButton action={rechazarOferta.bind(null, oferta.link)} variant="destructive-outline" refreshOnError>
                                    Rechazar
                                </ActionButton>
                            </CardContent>
                        </Card>
                    </Expiring>
                ))}
        </main>
    );
}
```

### Caso de validación, desde la pantalla

1. `/lista-de-espera/ocupados` → Servicio y día de un Turno tomado → **Avisarme si se libera** → nombre y email.
2. Cancelá ese Turno desde su Enlace (`/turnos/<link>` → Cancelar).
3. `/lista-de-espera/ofertas` → tu email: aparece la oferta con la cuenta regresiva.
4. Vencela en la base sin tocar la pantalla: `UPDATE "SlotWaitlistEntry" SET "offerExpiresAt" = now() - interval '1 minute' WHERE email = '<tu email>';`
5. **Aceptar** → toast "La oferta venció: se la ofrecimos a la siguiente persona de la lista", la tarjeta se va y
   la lista se recarga. Nada de "Error" genérico.
6. Con el celular (o el modo responsive del navegador, 375 px): todo en una columna y los botones apilados.

---

## 6. Agenda diaria del profesional (front)

### Decisiones

| Pregunta | Decisión | Por qué |
|---|---|---|
| Estado "atendido" | Columna `attendedAt` y `PATCH /agenda/:id/attended` | En Agendic no existe: un Turno pasado sin Ausencia no dice si se atendió |
| "No presentado" y "cancelado" | Los endpoints que ya existen: `PATCH /bookings/:id/no-show` y `PATCH /bookings/:id/cancel` | Ya validan todo |
| "No presentado" antes de terminar | Deshabilitado hasta `endsAt` | El back que ya existe lo rechaza hasta que el Turno termina, así que la pantalla avisa eso |
| Huecos libres | Entre los Turnos no cancelados, de 08:00 a 20:00 (constantes) | Leer las Franjas de la Availability es otra consigna |
| Horas trabajadas | Suma de la duración de los Turnos con `attendedAt` | — |
| "Al instante" | `ActionButton` recarga la página al marcar: el número se recalcula en el servidor | — |

### Back: `prisma/schema.prisma`

En `model Booking`: `attendedAt DateTime? @db.Timestamptz(3)`

### Back: `src/infrastructure/agenda/agenda.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { BusinessRuleError, NotFoundError } from '../../domain/errors';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Los Turnos que atiende el Usuario en el día (`YYYY-MM-DD`, hora argentina) y sus Ausencias de ese día. */
  async day(userId: number, date: string) {
    const from = new Date(`${date}T00:00:00-03:00`);
    const [bookings, absences] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          userId,
          status: { in: ['PENDING', 'BOOKED', 'CANCELLED'] },
          startsAt: { gte: from, lt: new Date(from.getTime() + 86_400_000) },
        },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          status: true,
          noShowAt: true,
          attendedAt: true,
          client: { select: { name: true } },
          service: { select: { name: true } },
        },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.outOfOffice.findMany({
        where: { userId, startDate: { lte: new Date(date) }, endDate: { gte: new Date(date) } },
        select: { id: true, reason: true, notes: true },
      }),
    ]);
    return { bookings, absences };
  }

  async attended(userId: number, id: number) {
    const booking = await this.prisma.booking.findFirst({ where: { id, userId } });
    if (!booking) throw new NotFoundError(`No atendés el Turno ${id}`);
    if (booking.status !== 'BOOKED') throw new BusinessRuleError(`El Turno ${id} no está aceptado (está ${booking.status})`);
    if (booking.startsAt > new Date()) throw new BusinessRuleError(`El Turno ${id} todavía no empezó`);
    if (booking.noShowAt) throw new BusinessRuleError(`El Turno ${id} está marcado como no presentado`);
    return this.prisma.booking.update({ where: { id }, data: { attendedAt: new Date() }, select: { id: true, attendedAt: true } });
  }
}
```

### Back: `src/infrastructure/agenda/agenda.controller.ts`

```ts
import { Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { AgendaService } from './agenda.service';

@Controller('agenda')
@UseGuards(ClerkGuard)
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  /** `GET /agenda?date=2026-12-01` */
  @Get()
  day(@CurrentUser() userId: number, @Query('date') date: string) {
    return this.agenda.day(userId, date);
  }

  @Patch(':id/attended')
  attended(@CurrentUser() userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.agenda.attended(userId, id);
  }
}
```

### Back: `src/infrastructure/agenda/agenda.module.ts`

```ts
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

@Module({
  imports: [UsersModule],
  controllers: [AgendaController],
  providers: [AgendaService],
})
export class AgendaModule {}
```

Y `AgendaModule` en los `imports` de `infrastructure.module.ts`.

### Front: `app/(app)/agenda/actions.ts`

```ts
'use server';

import { back } from '@/app/_components/back';

export async function marcarAtendido(id: number) {
    return back('PATCH', `/agenda/${id}/attended`, { auth: true });
}

export async function marcarNoPresentado(id: number) {
    return back('PATCH', `/bookings/${id}/no-show`, { auth: true });
}

export async function cancelarTurno(id: number) {
    return back('PATCH', `/bookings/${id}/cancel`, { body: {}, auth: true });
}
```

### Front: `app/(app)/agenda/page.tsx`

```tsx
import Link from 'next/link';
import { back } from '@/app/_components/back';
import { ActionButton } from '@/app/_components/quick/ActionButton';
import { addDays, fmtTime, ymd } from '@/app/_components/quick/dates';
import { ErrorAlert } from '@/app/_components/quick/ErrorAlert';
import { Alert, AlertDescription, AlertTitle } from '@/app/_components/ui/alert';
import { Badge } from '@/app/_components/ui/badge';
import { Button } from '@/app/_components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';
import { cancelarTurno, marcarAtendido, marcarNoPresentado } from './actions';

/** La línea de tiempo muestra los huecos libres entre estas horas. */
const DAY_START = '08:00';
const DAY_END = '20:00';

type Turno = {
    id: number;
    startsAt: string;
    endsAt: string;
    status: 'PENDING' | 'BOOKED' | 'CANCELLED';
    noShowAt: string | null;
    attendedAt: string | null;
    client: { name: string } | null;
    service: { name: string };
};
type Agenda = { bookings: Turno[]; absences: { id: number; reason: string; notes: string | null }[] };
type Item = { kind: 'turno'; turno: Turno; at: string } | { kind: 'hueco'; at: string; until: string };

/** Los Turnos del día con los huecos libres entre ellos (los cancelados no ocupan lugar). */
function timeline(date: string, turnos: Turno[]): Item[] {
    const items: Item[] = turnos.map((turno) => ({ kind: 'turno', turno, at: turno.startsAt }));
    let cursor = new Date(`${date}T${DAY_START}:00-03:00`).toISOString();
    for (const t of turnos.filter((t) => t.status !== 'CANCELLED')) {
        if (t.startsAt > cursor) items.push({ kind: 'hueco', at: cursor, until: t.startsAt });
        if (t.endsAt > cursor) cursor = t.endsAt;
    }
    const end = new Date(`${date}T${DAY_END}:00-03:00`).toISOString();
    if (end > cursor) items.push({ kind: 'hueco', at: cursor, until: end });
    return items.sort((a, b) => a.at.localeCompare(b.at));
}

/** Por qué no se puede hacer `accion` sobre el Turno, o null si se puede. */
function motivo(t: Turno, accion: 'atendido' | 'noPresentado' | 'cancelar', now: number): string | null {
    if (t.status === 'CANCELLED') return 'Un turno cancelado no se puede cambiar de estado.';
    if (t.status === 'PENDING') return 'Está pendiente: aceptalo o rechazalo en Turnos.';
    if (t.attendedAt) return 'Ya está atendido.';
    if (t.noShowAt) return 'Ya está como no presentado.';
    if (accion === 'cancelar') return null;
    if (Date.parse(t.startsAt) > now) return `Todavía no empezó (empieza a las ${fmtTime(t.startsAt)}).`;
    if (accion === 'noPresentado' && Date.parse(t.endsAt) > now) return `Se marca cuando termina, a las ${fmtTime(t.endsAt)}.`;
    return null;
}

function estado(t: Turno) {
    if (t.status === 'CANCELLED') return <Badge variant="destructive">Cancelado</Badge>;
    if (t.attendedAt) return <Badge>Atendido</Badge>;
    if (t.noShowAt) return <Badge variant="outline">No presentado</Badge>;
    return <Badge variant="secondary">{t.status === 'PENDING' ? 'Pendiente' : 'Confirmado'}</Badge>;
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
    const { date = ymd() } = await searchParams;
    const result = await back<Agenda>('GET', `/agenda?date=${date}`, { auth: true });
    if (!result.ok) return <ErrorAlert message={result.message} />;

    const { bookings, absences } = result.data;
    const now = Date.now();
    const horas = bookings
        .filter((t) => t.attendedAt)
        .reduce((total, t) => total + (Date.parse(t.endsAt) - Date.parse(t.startsAt)) / 3_600_000, 0);
    const proximo = bookings.find((t) => t.status === 'BOOKED' && Date.parse(t.startsAt) > now);

    return (
        <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
                <Button variant="outline" render={<Link href={`?date=${addDays(date, -1)}`} />}>
                    ← Anterior
                </Button>
                <h1 className="text-xl font-semibold">{new Date(`${date}T12:00:00-03:00`).toLocaleDateString('es-AR', { dateStyle: 'full' })}</h1>
                <Button variant="outline" render={<Link href={`?date=${addDays(date, 1)}`} />}>
                    Siguiente →
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardDescription>Horas trabajadas</CardDescription>
                        <CardTitle className="text-2xl">{horas.toLocaleString('es-AR', { maximumFractionDigits: 1 })} h</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Próximo cliente</CardDescription>
                        <CardTitle className="text-2xl">
                            {proximo ? `${fmtTime(proximo.startsAt)} · ${proximo.client?.name ?? 'Sin nombre'}` : 'Nadie más hoy'}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {absences.map((a) => (
                <Alert key={a.id} variant="warning">
                    <AlertTitle>Ausencia todo el día</AlertTitle>
                    <AlertDescription>{a.notes ?? a.reason}</AlertDescription>
                </Alert>
            ))}

            {timeline(date, bookings).map((item) =>
                item.kind === 'hueco' ? (
                    <p key={`hueco-${item.at}`} className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                        Libre de {fmtTime(item.at)} a {fmtTime(item.until)}
                    </p>
                ) : (
                    <Card key={item.turno.id}>
                        <CardHeader>
                            <CardTitle>
                                {fmtTime(item.turno.startsAt)}–{fmtTime(item.turno.endsAt)} · {item.turno.client?.name ?? 'Sin nombre'}
                            </CardTitle>
                            <CardDescription>{item.turno.service.name}</CardDescription>
                            <div>{estado(item.turno)}</div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-start">
                            <ActionButton action={marcarAtendido.bind(null, item.turno.id)} disabledReason={motivo(item.turno, 'atendido', now)}>
                                Atendido
                            </ActionButton>
                            <ActionButton
                                action={marcarNoPresentado.bind(null, item.turno.id)}
                                variant="outline"
                                disabledReason={motivo(item.turno, 'noPresentado', now)}
                            >
                                No presentado
                            </ActionButton>
                            <ActionButton
                                action={cancelarTurno.bind(null, item.turno.id)}
                                variant="destructive-outline"
                                confirm="¿Cancelar este turno?"
                                disabledReason={motivo(item.turno, 'cancelar', now)}
                            >
                                Cancelar
                            </ActionButton>
                        </CardContent>
                    </Card>
                ),
            )}
        </div>
    );
}
```

### Front: el menú (tres lugares)

1. `app/(app)/layout.tsx` → `navItems`: `{ id: 'agenda', href: '/agenda', label: 'Agenda' }`
2. `app/(app)/_components/types.ts` → `| 'agenda'` en `SectionId`
3. `app/(app)/_components/AppSidebar.tsx` → importá `CalendarDays` de `lucide-react` y agregá `agenda: CalendarDays` en `ICONS`

### Caso de validación, desde la pantalla

1. Entrá como un Empleado con un Turno aceptado que empieza en 2 horas → **Agenda**.
2. En ese Turno, **No presentado** está deshabilitado y abajo dice "Todavía no empezó (empieza a las HH:MM)".
3. En un Turno de hoy que ya pasó, **Atendido** → arriba, "Horas trabajadas" sube en la duración del Turno.
4. Un Turno cancelado tiene los tres botones deshabilitados: "Un turno cancelado no se puede cambiar de estado".
5. **← Anterior** y **Siguiente →** cambian de día.

---

## 7. Reprogramación con política del establecimiento (front)

No hace falta back: `GET /booking-links/:link`, `GET /services/:id/slots`, `PATCH /booking-links/:link/reschedule`
y `PATCH /booking-links/:link/cancel` ya existen.

### Decisiones

| Pregunta | Decisión | Por qué |
|---|---|---|
| "Mis turnos" del Cliente | La página del Enlace del Turno: `/turnos/<link>/reprogramar` | El Cliente no tiene Sesión ni lista: cada Turno tiene su Enlace |
| La política | Constante `POLICY_HOURS = 24` en la página | El Servicio no tiene un plazo en esta rama |
| "Las acciones aparecen bloqueadas" | Reprogramar se bloquea fuera de la ventana. Cancelar no, pero avisa que se pierde la Seña | Si Cancelar también se bloqueara, la Seña nunca "se perdería", y la consigna pide informarlo |
| Resumen antes de confirmar | `JsonForm` con `review`: muestra "Horario anterior" y el nuevo, con **Volver** y **Confirmar** | — |
| "Vuelve al selector con los horarios actualizados" | `refreshOnError`: si el back rechaza, vuelve al form con el error y recarga los horarios | — |

### `app/turnos/[link]/reprogramar/actions.ts`

```ts
'use server';

import { back } from '@/app/_components/back';
import type { FormValues } from '@/app/_components/quick/JsonForm';

export async function reprogramar(link: string, values: FormValues) {
    return back('PATCH', `/booking-links/${link}/reschedule`, { body: { startsAt: values.startsAt } });
}

export async function cancelar(link: string) {
    return back('PATCH', `/booking-links/${link}/cancel`, { body: {} });
}
```

### `app/turnos/[link]/reprogramar/page.tsx`

```tsx
import { AppToaster } from '@/app/_components/AppToaster';
import { back } from '@/app/_components/back';
import { ActionButton } from '@/app/_components/quick/ActionButton';
import { addDays, fmtDateTime, fmtMoney, ymd } from '@/app/_components/quick/dates';
import { ErrorAlert } from '@/app/_components/quick/ErrorAlert';
import { JsonForm } from '@/app/_components/quick/JsonForm';
import { Alert, AlertDescription, AlertTitle } from '@/app/_components/ui/alert';
import { cancelar, reprogramar } from './actions';

/** Política del establecimiento: se puede reprogramar, y cancelar sin perder la seña, hasta estas horas antes. */
const POLICY_HOURS = 24;

type Turno = {
    status: 'PENDING' | 'BOOKED' | 'REJECTED' | 'CANCELLED';
    startsAt: string;
    serviceId: number;
    service: { name: string };
    depositAmount: string | null;
    depositPaidAt: string | null;
};
type Horarios = { days: { date: string; slots: string[] }[] };

export default async function ReprogramarPage({ params }: { params: Promise<{ link: string }> }) {
    const { link } = await params;
    const result = await back<Turno>('GET', `/booking-links/${link}`);
    if (!result.ok) return <ErrorAlert message={result.message} />;

    const turno = result.data;
    const horasQueFaltan = (Date.parse(turno.startsAt) - Date.now()) / 3_600_000;
    const activo = turno.status === 'PENDING' || turno.status === 'BOOKED';
    const aTiempo = horasQueFaltan >= POLICY_HOURS;
    const bloqueado = !activo
        ? 'Este turno ya no está activo.'
        : !aTiempo
          ? `Faltan ${Math.max(0, Math.floor(horasQueFaltan))} h y la política permite cambios hasta ${POLICY_HOURS} h antes.`
          : null;

    const sena = turno.depositPaidAt && turno.depositAmount ? fmtMoney(turno.depositAmount) : null;
    const alCancelar = !sena
        ? 'No pagaste seña, así que no hay nada que devolver.'
        : aTiempo
          ? `Cancelás con ${POLICY_HOURS} h o más: te devolvemos la seña de ${sena}.`
          : `Cancelás con menos de ${POLICY_HOURS} h: perdés la seña de ${sena}.`;

    // Solo se piden los horarios si se puede reprogramar.
    const hoy = ymd();
    const horarios = bloqueado
        ? null
        : await back<Horarios>('GET', `/services/${turno.serviceId}/slots?from=${hoy}&to=${addDays(hoy, 13)}`);
    const opciones = horarios?.ok
        ? horarios.data.days
              .flatMap((d) => d.slots)
              .filter((s) => s !== turno.startsAt)
              .map((s) => ({ value: s, label: fmtDateTime(s) }))
        : [];

    return (
        <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 sm:p-6">
            <AppToaster />
            <h1 className="text-xl font-semibold">Reprogramar o cancelar</h1>
            <p>
                {turno.service.name} · {fmtDateTime(turno.startsAt)}
            </p>

            <Alert variant="info">
                <AlertTitle>Política del establecimiento</AlertTitle>
                <AlertDescription>
                    Podés reprogramar hasta {POLICY_HOURS} h antes del turno. Si cancelás con menos, perdés la seña.
                </AlertDescription>
            </Alert>

            {bloqueado ? (
                <Alert variant="warning">
                    <AlertTitle>No se puede reprogramar</AlertTitle>
                    <AlertDescription>{bloqueado}</AlertDescription>
                </Alert>
            ) : horarios && !horarios.ok ? (
                <ErrorAlert message={horarios.message} />
            ) : (
                <JsonForm
                    action={reprogramar.bind(null, link)}
                    submitLabel="Revisar"
                    review={`Horario anterior: ${fmtDateTime(turno.startsAt)}`}
                    refreshOnError
                    successMessage="Turno reprogramado"
                    fields={[
                        {
                            name: 'startsAt',
                            label: 'Horario nuevo',
                            type: 'select',
                            options: opciones,
                            placeholder: opciones.length ? 'Elegí un horario' : 'No hay horarios en las próximas 2 semanas',
                            required: 'Elegí un horario',
                        },
                    ]}
                />
            )}

            <p className="text-sm text-muted-foreground">{activo ? alCancelar : null}</p>
            <ActionButton
                action={cancelar.bind(null, link)}
                variant="destructive-outline"
                confirm={`¿Cancelar el turno? ${alCancelar}`}
                successMessage="Turno cancelado"
                disabledReason={activo ? null : 'Este turno ya no está activo.'}
            >
                Cancelar turno
            </ActionButton>
        </main>
    );
}
```

### Caso de validación, desde la pantalla

1. Un Turno que empieza en **23 h** → `/turnos/<link>/reprogramar`: cartel amarillo "No se puede reprogramar —
   Faltan 22 h y la política permite cambios hasta 24 h antes." Sin selector.
2. Un Turno a más de 24 h → elegí un horario → **Revisar** → se ve "Horario anterior: ..." y "Horario nuevo: ...".
3. Antes de **Confirmar**, tomá ese horario con otra reserva (`POST /bookings` en Postman).
4. **Confirmar** → vuelve al selector con el error del back en rojo, y el horario ya no está en la lista.
5. **Cancelar turno** → el aviso dice si la Seña se devuelve o se pierde.

---

## 8. Dashboard administrativo (front)

### Decisiones

| Pregunta | Decisión | Por qué |
|---|---|---|
| ¿Quién es "administrador"? | El Dueño. El back responde 403 a cualquier otro y la página muestra "Acceso denegado" | — |
| ¿Qué devuelve el back? | Los Turnos del rango, las Sucursales y cuántos Empleados hay; los números los cuenta la página | Un endpoint que devuelve datos crudos es más corto que uno por indicador |
| Ocupación | Minutos de Turnos aceptados ÷ (días × 8 h × Empleados) | Sin leer Availabilities, es la aproximación más simple que da un porcentaje |
| Facturación simulada | Suma del precio de los aceptados sin Ausencia | — |
| "Al tocar un indicador" | Cada tarjeta es un link a `?metric=...` y abajo aparece la tabla de esos Turnos | Sin estado en el navegador |
| Rango de 120 días | `JsonForm` con `maxDaysAfter`: el error sale en el navegador y no navega, así que no se llama a la API. Si escriben la URL a mano, la página también lo valida antes de llamar | — |
| "Nunca NaN" | `porcentaje()` devuelve "Sin datos" si el total es 0, y la tabla vacía dice "Sin datos en este rango". No hay gráficos | — |

### Back: `src/infrastructure/dashboard/dashboard.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { BadRequestError, ForbiddenError } from '../../domain/errors';
import { PrismaService } from '../prisma.service';

const MAX_DAYS = 90;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Los Turnos del Negocio del Dueño en el rango (y la Sucursal, si viene). Los indicadores los calcula el front. */
  async get(userId: number, from: string, to: string, branchId?: number) {
    const business = await this.prisma.business.findUnique({
      where: { ownerId: userId },
      select: { id: true, branches: { select: { id: true, name: true } } },
    });
    if (!business) throw new ForbiddenError('Acceso denegado: el tablero es solo para el Dueño del Negocio');

    const start = new Date(`${from}T00:00:00-03:00`);
    const end = new Date(new Date(`${to}T00:00:00-03:00`).getTime() + 86_400_000);
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    if (!(days >= 1 && days <= MAX_DAYS)) throw new BadRequestError(`El rango tiene que ser de 1 a ${MAX_DAYS} días`);

    const branch = branchId ? { id: branchId, businessId: business.id } : { businessId: business.id };
    const [bookings, employees] = await Promise.all([
      this.prisma.booking.findMany({
        where: { startsAt: { gte: start, lt: end }, service: { branch } },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          status: true,
          noShowAt: true,
          price: true,
          client: { select: { name: true } },
          service: { select: { name: true } },
        },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.employee.count({
        where: { businessId: business.id, deletedAt: null, ...(branchId && { branches: { some: { branchId } } }) },
      }),
    ]);
    return { branches: business.branches, employees, bookings };
  }
}
```

### Back: `src/infrastructure/dashboard/dashboard.controller.ts`

```ts
import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ClerkGuard, CurrentUser } from '../users/clerk.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(ClerkGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** `GET /dashboard?from=2026-11-01&to=2026-11-30&branchId=2` */
  @Get()
  get(
    @CurrentUser() userId: number,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId', new ParseIntPipe({ optional: true })) branchId?: number,
  ) {
    return this.dashboard.get(userId, from, to, branchId);
  }
}
```

### Back: `src/infrastructure/dashboard/dashboard.module.ts`

```ts
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [UsersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

Y `DashboardModule` en los `imports` de `infrastructure.module.ts`.

### Front: `app/(app)/tablero/page.tsx`

```tsx
import Link from 'next/link';
import { back } from '@/app/_components/back';
import { DataTable } from '@/app/_components/quick/DataTable';
import { addDays, daysBetween, fmtMoney, ymd } from '@/app/_components/quick/dates';
import { ErrorAlert } from '@/app/_components/quick/ErrorAlert';
import { JsonForm } from '@/app/_components/quick/JsonForm';
import { Card, CardDescription, CardHeader, CardTitle } from '@/app/_components/ui/card';

const MAX_DAYS = 90;
/** Para la ocupación: horas laborables por Empleado y por día. */
const HOURS_PER_DAY = 8;

type Turno = {
    id: number;
    startsAt: string;
    endsAt: string;
    status: 'PENDING' | 'BOOKED' | 'REJECTED' | 'CANCELLED';
    noShowAt: string | null;
    price: string;
    client: { name: string } | null;
    service: { name: string };
};
type Tablero = { branches: { id: number; name: string }[]; employees: number; bookings: Turno[] };
type Params = { from?: string; to?: string; branchId?: string; metric?: string };

const minutos = (t: Turno) => (Date.parse(t.endsAt) - Date.parse(t.startsAt)) / 60_000;
const porcentaje = (parte: number, total: number) => (total > 0 ? `${Math.round((parte / total) * 100)} %` : 'Sin datos');

/** Cada indicador: qué Turnos lo componen y cómo se muestra su valor. */
const INDICADORES = {
    ocupacion: {
        label: 'Ocupación',
        turnos: (ts: Turno[]) => ts.filter((t) => t.status === 'BOOKED'),
        valor: (ts: Turno[], capacidad: number) => porcentaje(ts.reduce((m, t) => m + minutos(t), 0), capacidad),
    },
    facturacion: {
        label: 'Facturación simulada',
        turnos: (ts: Turno[]) => ts.filter((t) => t.status === 'BOOKED' && !t.noShowAt),
        valor: (ts: Turno[]) => fmtMoney(ts.reduce((total, t) => total + Number(t.price), 0)),
    },
    cancelaciones: {
        label: 'Cancelaciones',
        turnos: (ts: Turno[]) => ts.filter((t) => t.status === 'CANCELLED'),
        valor: (ts: Turno[]) => String(ts.length),
    },
    ausencias: {
        label: 'No presentados',
        turnos: (ts: Turno[]) => ts.filter((t) => t.noShowAt),
        valor: (ts: Turno[]) => String(ts.length),
    },
};
type Metrica = keyof typeof INDICADORES;

export default async function TableroPage({ searchParams }: { searchParams: Promise<Params> }) {
    const params = await searchParams;
    const { from = addDays(ymd(), -29), to = ymd(), branchId, metric } = params;

    // Si alguien escribe la URL a mano, el rango se valida igual antes de llamar al back.
    const dias = daysBetween(from, to);
    const rangoInvalido = !(dias >= 1 && dias <= MAX_DAYS) ? `El rango tiene que ser de 1 a ${MAX_DAYS} días.` : null;
    const result = rangoInvalido
        ? null
        : await back<Tablero>('GET', `/dashboard?from=${from}&to=${to}${branchId ? `&branchId=${branchId}` : ''}`, { auth: true });
    if (result && !result.ok) {
        return <ErrorAlert title={result.status === 403 ? 'Acceso denegado' : undefined} message={result.message} />;
    }

    const data = result?.data ?? { branches: [], employees: 0, bookings: [] };
    const capacidad = dias * HOURS_PER_DAY * 60 * data.employees;
    const link = (m: Metrica) => `?${new URLSearchParams({ from, to, ...(branchId && { branchId }), metric: m })}`;

    const ranking = Object.entries(
        data.bookings.reduce<Record<string, number>>((cuenta, t) => ({ ...cuenta, [t.service.name]: (cuenta[t.service.name] ?? 0) + 1 }), {}),
    )
        .map(([name, count]) => ({ id: name, name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6">
            <h1 className="text-xl font-semibold">Tablero</h1>
            <JsonForm
                toUrl
                submitLabel="Ver"
                fields={[
                    { name: 'from', label: 'Desde', type: 'date', defaultValue: from, required: 'Falta la fecha de inicio' },
                    {
                        name: 'to',
                        label: 'Hasta',
                        type: 'date',
                        defaultValue: to,
                        required: 'Falta la fecha de fin',
                        notBefore: { value: 'from', message: 'Hasta no puede ser antes que Desde' },
                        maxDaysAfter: { field: 'from', days: MAX_DAYS, message: `El rango máximo es de ${MAX_DAYS} días` },
                    },
                    {
                        name: 'branchId',
                        label: 'Sucursal',
                        type: 'select',
                        placeholder: 'Todas',
                        defaultValue: branchId,
                        options: data.branches.map((b) => ({ value: b.id, label: b.name })),
                    },
                ]}
            />
            {rangoInvalido && <ErrorAlert message={rangoInvalido} />}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(INDICADORES) as Metrica[]).map((m) => {
                    const indicador = INDICADORES[m];
                    return (
                        <Link key={m} href={link(m)}>
                            <Card className={metric === m ? 'ring-2 ring-primary' : undefined}>
                                <CardHeader>
                                    <CardDescription>{indicador.label}</CardDescription>
                                    <CardTitle className="text-2xl">{indicador.valor(indicador.turnos(data.bookings), capacidad)}</CardTitle>
                                </CardHeader>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {metric && metric in INDICADORES && (
                <section className="flex flex-col gap-2">
                    <h2 className="font-semibold">Turnos de: {INDICADORES[metric as Metrica].label}</h2>
                    <DataTable
                        rows={INDICADORES[metric as Metrica].turnos(data.bookings)}
                        empty="Sin datos en este rango"
                        columns={[
                            { label: 'Fecha', key: 'startsAt', format: 'datetime' },
                            { label: 'Servicio', cell: (t) => t.service.name },
                            { label: 'Cliente', cell: (t) => t.client?.name ?? '—' },
                            { label: 'Precio', key: 'price', format: 'money' },
                        ]}
                    />
                </section>
            )}

            <section className="flex flex-col gap-2">
                <h2 className="font-semibold">Los 5 servicios más pedidos</h2>
                <DataTable
                    rows={ranking}
                    empty="Sin datos en este rango"
                    columns={[
                        { label: 'Servicio', key: 'name' },
                        { label: 'Turnos', key: 'count' },
                    ]}
                />
            </section>
        </div>
    );
}
```

Menú: igual que en la consigna 6, con `{ id: 'dashboard', href: '/tablero', label: 'Tablero' }`, `| 'dashboard'` y
`dashboard: LayoutDashboard`.

### Caso de validación, desde la pantalla

1. Como Dueño → **Tablero** → elegí un rango sin Turnos (por ejemplo, un mes del año que viene): los cuatro
   indicadores dicen `Sin datos`, `$ 0,00`, `0`, `0`, y el ranking "Sin datos en este rango". Ningún `NaN`.
2. Elegí del 1/1 al 30/4 (120 días) → **Ver**: debajo de "Hasta" sale "El rango máximo es de 90 días" y la URL no
   cambia (en la pestaña Network no hay request).
3. Tocá **Cancelaciones**: aparece la tabla con esos Turnos.
4. Entrá como un Empleado que no es Dueño a `/tablero`: "Acceso denegado".

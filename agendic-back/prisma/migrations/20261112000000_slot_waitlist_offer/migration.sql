-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'OFFERED';

-- CreateTable
CREATE TABLE "SlotWaitlistEntry" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "employeeId" INTEGER,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "clientName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "offerBookingId" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offeredAt" TIMESTAMPTZ(3),
    "acceptedAt" TIMESTAMPTZ(3),
    "leftAt" TIMESTAMPTZ(3),
    "expiredAt" TIMESTAMPTZ(3),

    CONSTRAINT "SlotWaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlotWaitlistEntry_link_key" ON "SlotWaitlistEntry"("link");

-- CreateIndex
CREATE UNIQUE INDEX "SlotWaitlistEntry_offerBookingId_key" ON "SlotWaitlistEntry"("offerBookingId");

-- CreateIndex
CREATE INDEX "SlotWaitlistEntry_serviceId_employeeId_startsAt_createdAt_idx" ON "SlotWaitlistEntry"("serviceId", "employeeId", "startsAt", "createdAt");

-- AddForeignKey
ALTER TABLE "SlotWaitlistEntry" ADD CONSTRAINT "SlotWaitlistEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotWaitlistEntry" ADD CONSTRAINT "SlotWaitlistEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotWaitlistEntry" ADD CONSTRAINT "SlotWaitlistEntry_offerBookingId_fkey" FOREIGN KEY ("offerBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BookingCalendarEvent" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "syncedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BookingCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingCalendarEvent_bookingId_key" ON "BookingCalendarEvent"("bookingId");

-- CreateIndex
CREATE INDEX "BookingCalendarEvent_userId_idx" ON "BookingCalendarEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingCalendarEvent_userId_googleEventId_key" ON "BookingCalendarEvent"("userId", "googleEventId");

-- AddForeignKey
ALTER TABLE "BookingCalendarEvent" ADD CONSTRAINT "BookingCalendarEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCalendarEvent" ADD CONSTRAINT "BookingCalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BookingRating" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingRating_bookingId_key" ON "BookingRating"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingRating" ADD CONSTRAINT "BookingRating_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Calificación: puntaje de 1 a 5
ALTER TABLE "BookingRating" ADD CONSTRAINT "BookingRating_score_range" CHECK ("score" BETWEEN 1 AND 5);

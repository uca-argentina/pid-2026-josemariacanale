-- El Cliente sale de Turno a su propia tabla, una fila por Turno (ADR 0022).
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Client_bookingId_key" ON "Client"("bookingId");
CREATE INDEX "Client_email_idx" ON "Client"("email");
ALTER TABLE "Client" ADD CONSTRAINT "Client_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Client" ("bookingId", "name", "email") SELECT "id", "clientName", "clientEmail" FROM "Booking";

ALTER TABLE "Booking" DROP COLUMN "clientName", DROP COLUMN "clientEmail";

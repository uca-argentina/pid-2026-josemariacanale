-- CreateTable
CREATE TABLE "CheckIn" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "arrivedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

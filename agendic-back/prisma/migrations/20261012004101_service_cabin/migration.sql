-- CreateTable
CREATE TABLE "ServiceCabin" (
    "serviceId" INTEGER NOT NULL,
    "cabinId" INTEGER NOT NULL,

    CONSTRAINT "ServiceCabin_pkey" PRIMARY KEY ("serviceId","cabinId")
);

-- CreateIndex
CREATE INDEX "ServiceCabin_cabinId_idx" ON "ServiceCabin"("cabinId");

-- AddForeignKey
ALTER TABLE "ServiceCabin" ADD CONSTRAINT "ServiceCabin_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCabin" ADD CONSTRAINT "ServiceCabin_cabinId_fkey" FOREIGN KEY ("cabinId") REFERENCES "Cabin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Cabin" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "Cabin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cabin_branchId_idx" ON "Cabin"("branchId");

-- AddForeignKey
ALTER TABLE "Cabin" ADD CONSTRAINT "Cabin_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A name can repeat across Sucursales and be reused once its Cabina is dada de baja (ADR 0030, 0004).
CREATE UNIQUE INDEX "Cabin_branchId_name_ci_key" ON "Cabin"("branchId", lower("name")) WHERE "deletedAt" IS NULL;

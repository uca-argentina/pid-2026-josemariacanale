-- CreateTable
CREATE TABLE "BranchImage" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "BranchImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BranchImage_branchId_order_idx" ON "BranchImage"("branchId", "order");

-- AddForeignKey
ALTER TABLE "BranchImage" ADD CONSTRAINT "BranchImage_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

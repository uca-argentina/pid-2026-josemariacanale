-- The Enlace de reserva a Business is reached by. No backfill: no Business has been created yet.

-- AlterTable
ALTER TABLE "Business" ADD COLUMN "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

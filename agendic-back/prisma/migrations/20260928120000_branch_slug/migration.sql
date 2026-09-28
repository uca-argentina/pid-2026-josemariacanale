-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "slug" TEXT;

-- Backfill: each Negocio's first Sucursal takes the Negocio's slug, as Crear Negocio does from now on;
-- any other takes one built from its id, for the Dueño to rename.
UPDATE "Branch" AS b
SET "slug" = CASE
  WHEN b."id" = (SELECT MIN(f."id") FROM "Branch" AS f WHERE f."businessId" = b."businessId")
    THEN (SELECT n."slug" FROM "Business" AS n WHERE n."id" = b."businessId")
  ELSE 'sucursal-' || b."id"
END;

ALTER TABLE "Branch" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Branch_businessId_slug_key" ON "Branch"("businessId", "slug");

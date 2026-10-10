-- Backfill: a Sucursal that still carries its Negocio's slug (what the first Sucursal got when Crear Negocio
-- sent none, `/business/x/x`) takes one built from its name, as Crear Negocio sends it now.
-- Left as is when the name leaves under 3 characters or another Sucursal of the Negocio already has that slug.
WITH candidate AS (
  SELECT
    b."id",
    b."businessId",
    trim(both '-' from left(trim(both '-' from regexp_replace(
      lower(translate(b."name", 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
      '[^a-z0-9]+', '-', 'g'
    )), 40)) AS "slug"
  FROM "Branch" AS b
  JOIN "Business" AS n ON n."id" = b."businessId"
  WHERE b."slug" = n."slug"
)
UPDATE "Branch" AS b
SET "slug" = c."slug"
FROM candidate AS c
WHERE b."id" = c."id"
  AND length(c."slug") >= 3
  AND c."slug" <> b."slug"
  AND NOT EXISTS (
    SELECT 1 FROM "Branch" AS o WHERE o."businessId" = c."businessId" AND o."slug" = c."slug"
  );

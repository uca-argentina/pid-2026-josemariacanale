-- CreateIndex
CREATE UNIQUE INDEX "Invitation_id_businessId_key" ON "Invitation"("id", "businessId");

-- CreateTable
CREATE TABLE "InvitationBranch" (
    "invitationId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "businessId" INTEGER NOT NULL,

    CONSTRAINT "InvitationBranch_pkey" PRIMARY KEY ("invitationId","branchId")
);

-- CreateIndex
CREATE INDEX "InvitationBranch_branchId_idx" ON "InvitationBranch"("branchId");

-- AddForeignKey: the shared businessId keeps the Sucursal in the Invitación's own Negocio.
ALTER TABLE "InvitationBranch" ADD CONSTRAINT "InvitationBranch_invitationId_businessId_fkey" FOREIGN KEY ("invitationId", "businessId") REFERENCES "Invitation"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationBranch" ADD CONSTRAINT "InvitationBranch_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "Branch"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Las Invitaciones que todavía no se cerraron (vencidas incluidas, porque reenviar las renueva) llevan todas las
-- Sucursales del Negocio, como las dejaba Aceptar invitación hasta ahora.
INSERT INTO "InvitationBranch" ("invitationId", "branchId", "businessId")
SELECT i."id", b."id", i."businessId"
FROM "Invitation" i
JOIN "Branch" b ON b."businessId" = i."businessId"
WHERE i."closedAt" IS NULL;

CREATE TABLE "Invitation" (
    "id" SERIAL NOT NULL,
    "businessId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Invitation_businessId_email_idx" ON "Invitation"("businessId", "email");

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integration credentials are encrypted by the application before persistence.
CREATE TABLE "IntegrationSetting" (
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "valueHint" TEXT NOT NULL,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "IntegrationSetting_updatedById_updatedAt_idx"
ON "IntegrationSetting"("updatedById", "updatedAt");

ALTER TABLE "IntegrationSetting"
ADD CONSTRAINT "IntegrationSetting_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

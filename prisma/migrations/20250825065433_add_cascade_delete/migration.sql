-- DropForeignKey
ALTER TABLE "public"."Map" DROP CONSTRAINT "Map_vaultId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Note" DROP CONSTRAINT "Note_vaultId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Source" DROP CONSTRAINT "Source_vaultId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Vault" DROP CONSTRAINT "Vault_ownerId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Vault" ADD CONSTRAINT "Vault_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Source" ADD CONSTRAINT "Source_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "public"."Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "public"."Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Map" ADD CONSTRAINT "Map_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "public"."Vault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

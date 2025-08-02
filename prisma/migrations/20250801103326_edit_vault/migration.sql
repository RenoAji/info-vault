/*
  Warnings:

  - You are about to alter the column `password` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the column `title` on the `Vault` table. All the data in the column will be lost.
  - Added the required column `description` to the `Vault` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Vault` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "password" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "public"."Vault" DROP COLUMN "title",
ADD COLUMN     "description" VARCHAR(1024) NOT NULL,
ADD COLUMN     "name" VARCHAR(255) NOT NULL;

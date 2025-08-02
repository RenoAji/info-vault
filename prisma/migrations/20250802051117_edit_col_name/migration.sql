/*
  Warnings:

  - You are about to drop the column `title` on the `Map` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Source` table. All the data in the column will be lost.
  - Added the required column `name` to the `Map` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Source` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Map" DROP COLUMN "title",
ADD COLUMN     "name" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Note" DROP COLUMN "title",
ADD COLUMN     "name" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Source" DROP COLUMN "title",
ADD COLUMN     "name" VARCHAR(255) NOT NULL;

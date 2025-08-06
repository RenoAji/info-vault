import { PrismaClient } from  "@/app/generated/prisma";

console.log("Prisma Client initialized");
const prisma = new PrismaClient();
export default prisma;
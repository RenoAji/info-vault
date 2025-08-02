import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Example: Extract user ID from request (assuming JWT in Authorization header)
async function getUserIdFromRequest() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return parseInt(session.user.id); // Convert string ID to number if needed
  }
  return null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(); // Make sure to await here
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaults = await prisma.vault.findMany({
    where: {
      ownerId: {
        equals: await userId,
      },
    },
  });
  return NextResponse.json(vaults, { status: 200 });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, description } = await req.json();

  const vault = await prisma.vault.create({
    data: {
      ownerId: await userId,
      name: name,
      description: description,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return NextResponse.json(vault, { status: 201 });
}



import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const GET = async (req: NextRequest) => {
  const vaultId = req.nextUrl.searchParams.get("vaultId");
  console.log("Fetching notes for vaultId:", vaultId);

  // Fetch notes from the database
  const note = await prisma.note.findUnique({
    where: {
      vaultId: vaultId ? parseInt(vaultId) : undefined, // Ensure vaultId is an integer
    },
  });

  return NextResponse.json(
    {
      success: true,
      content: note?.content || "",
    },
    { status: 200 }
  );
};

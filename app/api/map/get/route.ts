import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const GET = async (req: NextRequest) => {
  console.log("Route request /api/map/get received");

  // Validate vaultId
  const vaultId = req.nextUrl.searchParams.get("vaultId");
  if (!vaultId || isNaN(parseInt(vaultId))) {
    return NextResponse.json(
      { success: false, error: "Valid vaultId is required" },
      { status: 400 }
    );
  }

  // Fetch map from database
  const vaultIdInt = parseInt(vaultId);
  const map = await prisma.map.findFirst({
    where: { vaultId: vaultIdInt },
    select: {
      content: true,
    },
  });

  if (!map) {
    return NextResponse.json(
      { success: false, error: "Map not found" },
      { status: 404 }
    );
  }
  console.log("Map fetched successfully for vaultId:", vaultIdInt);
  return NextResponse.json(
    { success: true, mindMap: map.content },
    { status: 200 }
  );
};

import { NextRequest, NextResponse } from "next/server";
import { generateNote } from "@/lib/services/generate-note";

export const GET = async (req: NextRequest) => {
  const vaultId = req.nextUrl.searchParams.get("vaultId");

  // Validate vaultId
  if (!vaultId || isNaN(parseInt(vaultId))) {
    return NextResponse.json(
      { success: false, error: "Valid vaultId is required" },
      { status: 400 }
    );
  }

  // Generate note
  const res = generateNote(vaultId);
  if ((await res).success) {
    return NextResponse.json(
      { success: true, notes: (await res).notes },
      { status: 200 }
    );
  } else {
    return NextResponse.json(
      { success: false, error: (await res).error },
      { status: 500 }
    );
  }
};

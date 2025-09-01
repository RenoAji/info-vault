import { NextRequest, NextResponse } from "next/server";
import { generateNote } from "@/lib/services/generate-note";

export const GET = async (req: NextRequest) => {
  console.log("Notes generation request received");
  const vaultId = req.nextUrl.searchParams.get("vaultId");

  // Validate vaultId
  if (!vaultId || isNaN(parseInt(vaultId))) {
    return NextResponse.json(
      { success: false, error: "Valid vaultId is required" },
      { status: 400 }
    );
  }

  // Generate note
  const res = await generateNote(vaultId);

  console.log("Note generation done");
  if (res.success) {
    return NextResponse.json(
      { success: true, notes: res.notes },
      { status: 200 }
    );
  } else {
    return NextResponse.json(
      { success: false, error: res.error },
      { status: 500 }
    );
  }
};

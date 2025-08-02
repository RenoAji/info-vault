import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  const vault = await prisma.vault.delete({
    where: {
      id: parseInt(id),
    },
  });
  return NextResponse.json({"message":"Delete Success"}, { status: 201 });
}
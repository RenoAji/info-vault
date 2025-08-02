import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import prisma from "@/lib/prisma";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export const GET = async (req: NextRequest) => {
  const vaultId = req.nextUrl.searchParams.get("vaultId");
  console.log("Vault ID:", vaultId);

  // Fetch uploaded files from the database
  const sources = await prisma.source.findMany({
    where: {
      vaultId: vaultId ? parseInt(vaultId) : undefined, // Ensure vaultId is an integer
    },
  });

  console.log("Fetched sources:", sources);
  return NextResponse.json(sources);
};

export const POST = async (req: NextRequest) => {
  const vaultId = req.nextUrl.searchParams.get("vaultId");
  console.log("Vault ID:", vaultId);
  const formData = await req.formData();
  const body = Object.fromEntries(formData);
  const file = (body.file as Blob) || null;
  let buffer: Buffer | null = null;
  const originalFileName = (body.file as File).name;
  if (file) {
    buffer = Buffer.from(await file.arrayBuffer());
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR);
    }

    fs.writeFileSync(
      path.resolve(UPLOAD_DIR, (body.file as File).name),
      buffer
    );
  } else {
    return NextResponse.json({
      success: false,
    });
  }

  // Rename the file to ensure uniqueness
  
  const newFileName = `${Date.now()}_${(body.file as File).name}`;
  fs.renameSync(
    path.resolve(UPLOAD_DIR, (body.file as File).name),
    path.resolve(UPLOAD_DIR, newFileName)
  );
  body.file = new File([buffer!], newFileName, {
    type: (body.file as File).type,
  });

  // Save file metadata to the database
  const created = await prisma.source.create({
    data: {
      name: originalFileName,
      url: `/uploads/${(body.file as File).name}`,
      vaultId: vaultId ? parseInt(vaultId) : null, // Ensure vaultId is an integer
    },
  });

  return NextResponse.json({
    success: true,
    name: originalFileName,
    id: created.id,
    url: `/uploads/${(body.file as File).name}`,
  });
};

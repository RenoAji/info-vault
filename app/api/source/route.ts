import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import prisma from "@/lib/prisma";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { getOrCreateCollection } from "@/lib/chroma";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
export const GET = async (req: NextRequest) => {
  const vaultId = req.nextUrl.searchParams.get("vaultId");

  // Fetch uploaded files from the database
  const sources = await prisma.source.findMany({
    where: {
      vaultId: vaultId ? parseInt(vaultId) : undefined, // Ensure vaultId is an integer
    },
  });

  return NextResponse.json(sources);
};

export const POST = async (req: NextRequest) => {
  const vaultId = req.nextUrl.searchParams.get("vaultId");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  // If user upload text
  if (req.headers.get("content-type") === "application/json") {
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: "Text are required",
        },
        { status: 500 }
      );
    }

    // Save text as a file
    const fileName = `text_${Date.now()}.txt`;
    const filePath = path.resolve(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, text);

    // Chunking and store to chroma
    const splitted = await splitter.createDocuments([text]);
    const docs = [];
    const ids = [];
    const metadatas = [];
    for (let i = 0; i < splitted.length; i++) {
      const doc = splitted[i];
      docs.push(doc.pageContent);
      ids.push(`text-${Date.now()}-${i}`);
      metadatas.push({
        source: filePath,
        vaultId: vaultId ? parseInt(vaultId) : null, // Ensure vaultId is an integer
      });
    }

    // Use the shared helper
    const collection = await getOrCreateCollection("source-embeddings");

    // Store it in the vector database
    try {
      await collection.add({
        ids,
        documents: docs,
        metadatas,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to store documents in the vector database",
        },
        { status: 500 }
      );
    }

    // Save file metadata to regular database
    const created = await prisma.source.create({
      data: {
        name: fileName,
        url: filePath,
        vaultId: vaultId ? parseInt(vaultId) : null, // Ensure vaultId is an integer
      },
    });

    return NextResponse.json({
      success: true,
      name: fileName,
      id: created.id,
      url: `/uploads/${fileName}`,
    });
  }
  // If user upload file
  else {
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
      return NextResponse.json(
        {
          success: false,
        },
        { status: 500 }
      );
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
        url: path.resolve(UPLOAD_DIR, newFileName),
        vaultId: vaultId ? parseInt(vaultId) : null, // Ensure vaultId is an integer
      },
    });

    // Load the file and store it in the vector database
    let loader;
    if ((body.file as File).type === "application/pdf") {
      loader = new PDFLoader(path.resolve(UPLOAD_DIR, newFileName));
    } else if ((body.file as File).type === "text/plain") {
      loader = new TextLoader(path.resolve(UPLOAD_DIR, newFileName));
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported file type",
        },
        { status: 500 }
      );
    }
    const docs = await loader.load();
    if (docs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load documents from the file",
        },
        { status: 500 }
      );
    }

    // Chunking and store to chroma
    const splitted = await splitter.splitDocuments(docs);
    const inputs = [];
    const ids = [];
    const metadatas = [];
    for (let i = 0; i < splitted.length; i++) {
      const input = splitted[i];
      if (input.pageContent.length < 10) {
        continue; // Skip empty chunks
      }
      inputs.push(input.pageContent);
      ids.push(`file-${Date.now()}-${i}`);
      metadatas.push({
        source: path.resolve(UPLOAD_DIR, newFileName),
        vaultId: vaultId ? parseInt(vaultId) : null, // Ensure vaultId is an integer,
        page: input.metadata.loc.pageNumber || 0, // Add page metadata if available
        linesFrom: input.metadata.loc.lines.from || 0,
        linesTo: input.metadata.loc.lines.to || 0,
      });
    }

    // Store it in the vector database
    const collection = await getOrCreateCollection("source-embeddings");
    try {
      await collection.add({
        ids,
        documents: inputs,
        metadatas,
      });
    } catch (error) {
      console.error("Error storing documents in vector database:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to store documents in the vector database",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      name: originalFileName,
      id: created.id,
      url: `/uploads/${(body.file as File).name}`,
    });
  }
};

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

const collection = db.collection("pastes");

function createPreview(html: string) {
  const textWithBreaks = html
    .replace(/<\/(p|h1|h2|h3|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();

  const firstLine = textWithBreaks
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return (firstLine || "").slice(0, 80);
}

function isEmptyHtml(html: string) {
  return createPreview(html).length === 0;
}

export async function GET() {
  const snapshot = await collection.orderBy("updatedAt", "desc").get();

  const pastes = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json(pastes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, contentHtml } = body;

  if (typeof contentHtml !== "string") {
    return NextResponse.json(
      { error: "contentHtml inválido." },
      { status: 400 }
    );
  }

  if (isEmptyHtml(contentHtml)) {
    if (id) {
      await collection.doc(id).delete();
    }

    return NextResponse.json({ deleted: true, id: id ?? null });
  }

  const now = Date.now();
  const preview = createPreview(contentHtml);

  if (id) {
    await collection.doc(id).update({
      contentHtml,
      preview,
      updatedAt: now,
    });

    return NextResponse.json({ id });
  }

  const docRef = await collection.add({
    contentHtml,
    preview,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: docRef.id });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID não informado." },
      { status: 400 }
    );
  }

  await collection.doc(id).delete();

  return NextResponse.json({ deleted: true, id });
}
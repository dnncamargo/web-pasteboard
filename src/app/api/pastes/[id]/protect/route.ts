import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { hashPin, isValidPin } from "@/lib/pasteProtection";

const collection = db.collection("pastes");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { pin } = (body ?? {}) as { pin?: unknown };

  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN inválido." }, { status: 400 });
  }

  const docRef = collection.doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return NextResponse.json(
      { error: "Paste não encontrado." },
      { status: 404 }
    );
  }

  if (doc.data()?.protection) {
    return NextResponse.json(
      { error: "Paste já está protegido." },
      { status: 409 }
    );
  }

  const { pinHash, pinSalt } = hashPin(pin);

  await docRef.update({
    protection: { pinHash, pinSalt },
  });

  return NextResponse.json({ protected: true });
}
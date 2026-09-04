import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { isValidPin, verifyPin } from "@/lib/pasteProtection";

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

  const protection = doc.data()?.protection;

  if (
    !protection ||
    typeof protection.pinHash !== "string" ||
    typeof protection.pinSalt !== "string"
  ) {
    return NextResponse.json(
      { error: "Paste não está protegido." },
      { status: 409 }
    );
  }

  if (!verifyPin(pin, protection.pinHash, protection.pinSalt)) {
    return NextResponse.json({ error: "PIN incorreto." }, { status: 401 });
  }

  await docRef.update({
    protection: FieldValue.delete(),
  });

  return NextResponse.json({ protected: false });
}
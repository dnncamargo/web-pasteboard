import { db } from "@/lib/firebaseAdmin";

export default async function FirebaseTestPage() {
  const testRef = db.collection("connection_tests").doc("pasteboard-test");

  await testRef.set({
    message: "Firebase conectado ao Pasteboard.",
    updatedAt: Date.now(),
  });

  const snap = await testRef.get();
  const data = snap.data();

  return (
    <main style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>Firebase Test</h1>

      <p>Status: conectado</p>

      <pre>
        {JSON.stringify(
          {
            id: snap.id,
            ...data,
          },
          null,
          2
        )}
      </pre>
    </main>
  );
}
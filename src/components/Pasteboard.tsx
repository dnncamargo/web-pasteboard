"use client";

import { useEffect, useRef, useState } from "react";
import { Paste } from "@/types/paste";
import Editor from "./editor/Editor";
import Sidebar from "./Sidebar";

const SAVE_DELAY = 1000;

export default function Pasteboard() {
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [activePasteId, setActivePasteId] = useState<string | null>(null);
  const [contentHtml, setContentHtml] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lineCount, setLineCount] = useState(1);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [focusToken, setFocusToken] = useState(0);

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  async function loadPastes() {
    const response = await fetch("/api/pastes");
    const data = await response.json();
    setPastes(data);
  }

  useEffect(() => {
    loadPastes();
  }, []);

  function requestEditorFocus() {
    setFocusToken((value) => value + 1);
  }

  function handleNewPaste() {
    setActivePasteId(null);
    setContentHtml("");
    setStatus("idle");

    requestAnimationFrame(() => {
      setFocusToken((value) => value + 1);
    });
  }

  function handleSelectPaste(paste: Paste) {
    setActivePasteId(paste.id);
    setContentHtml(paste.contentHtml);
    setStatus("idle");
    requestEditorFocus();
  }

  async function handleDelete() {
    if (!activePasteId) {
      setContentHtml("");
      requestEditorFocus();
      return;
    }

    await fetch(`/api/pastes?id=${activePasteId}`, {
      method: "DELETE",
    });

    setActivePasteId(null);
    setContentHtml("");
    await loadPastes();
    requestEditorFocus();
  }

  function handleChange(html: string) {
    setContentHtml(html);
    setStatus("saving");

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(async () => {
      const response = await fetch("/api/pastes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: activePasteId,
          contentHtml: html,
        }),
      });

      const data = await response.json();

      if (data.deleted) {
        setActivePasteId(null);
      } else if (data.id && !activePasteId) {
        setActivePasteId(data.id);
      }

      setStatus("saved");
      await loadPastes();
    }, SAVE_DELAY);
  }

  return (
    <main className="pasteboard">
      <header className="pasteboard-header">
        <button className="pasteboard-title" onMouseDown={(event) => event.preventDefault()} onClick={handleNewPaste}>
          Pasteboard
        </button>

        <span className="save-status">
          {status === "saving" && "salvando..."}
          {status === "saved" && "salvo"}
        </span>
      </header>

      <div className="pasteboard-body">
        <Sidebar pastes={pastes} activePasteId={activePasteId} onSelectPaste={handleSelectPaste} pasteCount={pastes.length} />

        <section
          className="editor-column"
          onPointerDown={(event) => {
            const target = event.target as HTMLElement;

            const clickedInsideEditor = target.closest(".ProseMirror");
            const clickedToolbar = target.closest(".toolbar");
            const clickedDeleteButton = target.closest(".delete-button");

            if (clickedInsideEditor || clickedToolbar || clickedDeleteButton) {
              return;
            }

            event.preventDefault();
            requestEditorFocus();
          }}
        >
          <Editor
            contentHtml={contentHtml}
            onChange={handleChange}
            onLineCountChange={setLineCount}
            showLineNumbers={showLineNumbers}
            onToggleLineNumbers={() => setShowLineNumbers((value) => !value)}
            focusToken={focusToken}
          />

          <footer className="editor-footer">
            <span className="line-count">{lineCount} linhas</span>

            <button className="delete-button" onClick={handleDelete}>
              excluir
            </button>
          </footer>
        </section>
      </div>
    </main>
  );
}

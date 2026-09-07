"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Paste } from "@/types/paste";
import Editor from "./editor/Editor";
import Sidebar from "./Sidebar";

const SAVE_DELAY = 1000;
const PIN_MAX_LENGTH = 6;

type ProtectStage = "none" | "first" | "repeat";

function sanitizePin(value: string) {
  return value.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH);
}

export default function Pasteboard() {
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [activePasteId, setActivePasteId] = useState<string | null>(null);
  const [contentHtml, setContentHtml] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lineCount, setLineCount] = useState(1);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [focusToken, setFocusToken] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [activePastePin, setActivePastePin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [protectStage, setProtectStage] = useState<ProtectStage>("none");
  const [firstPin, setFirstPin] = useState("");
  const [unprotectArmed, setUnprotectArmed] = useState(false);

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const deleteTimeout = useRef<NodeJS.Timeout | null>(null);
  const unprotectTimeout = useRef<NodeJS.Timeout | null>(null);

  const activePaste = pastes.find((paste) => paste.id === activePasteId) ?? null;
  const isActiveProtected = Boolean(activePaste?.protected);
  const isLocked = isActiveProtected && activePastePin === null;
  const isUnlockedProtected = isActiveProtected && activePastePin !== null;
  const canProtect = !isActiveProtected && activePasteId !== null && protectStage === "none";

  function requestEditorFocus() {
    setFocusToken((value) => value + 1);
  }

  function clearPinInteraction() {
    setActivePastePin(null);
    setPinInput("");
    setPinError(null);
    setProtectStage("none");
    setFirstPin("");
  }

  function cancelProtectSetup() {
    setPinInput("");
    setPinError(null);
    setFirstPin("");
    setProtectStage("none");
  }

  function handleProtectKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      cancelProtectSetup();
    }
  }

  async function loadPastes() {
    const response = await fetch("/api/pastes");
    const data = await response.json();
    setPastes(data);
  }

  useEffect(() => {
    loadPastes();
  }, []);

  function handleNewPaste() {
    resetDeleteConfirmation();
    resetUnprotectConfirmation();
    clearPinInteraction();
    setActivePasteId(null);
    setContentHtml("");
    setStatus("idle");
    setMobileSidebarOpen(false);

    requestAnimationFrame(() => {
      requestEditorFocus();
    });
  }

  function handleSelectPaste(paste: Paste) {
    resetDeleteConfirmation();
    resetUnprotectConfirmation();
    clearPinInteraction();
    setActivePasteId(paste.id);
    setContentHtml(paste.protected ? "" : (paste.contentHtml ?? ""));
    setStatus("idle");
    setMobileSidebarOpen(false);

    if (!paste.protected) {
      requestAnimationFrame(() => {
        requestEditorFocus();
      });
    }
  }

  async function handleDelete() {
    setMobileSidebarOpen(false);

    if (!deleteArmed) {
      resetUnprotectConfirmation();
      setDeleteArmed(true);
      setPinError(null);

      if (deleteTimeout.current) {
        clearTimeout(deleteTimeout.current);
      }

      deleteTimeout.current = setTimeout(() => {
        setDeleteArmed(false);
        deleteTimeout.current = null;
      }, 3000);

      return;
    }

    resetDeleteConfirmation();

    if (!activePasteId) {
      setContentHtml("");
      requestEditorFocus();
      return;
    }

    await fetch(`/api/pastes?id=${activePasteId}`, {
      method: "DELETE",
    });

    resetUnprotectConfirmation();
    clearPinInteraction();
    setActivePasteId(null);
    setContentHtml("");
    await loadPastes();
    requestEditorFocus();
  }

  function handleChange(html: string) {
    resetDeleteConfirmation();
    resetUnprotectConfirmation();
    setMobileSidebarOpen(false);
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

  function handleToggleMobileSidebar() {
    setMobileSidebarOpen((value) => !value);
    resetDeleteConfirmation();
    resetUnprotectConfirmation();

    if (mobileSidebarOpen) {
      requestEditorFocus();
    }
  }

  function resetDeleteConfirmation() {
    setDeleteArmed(false);

    if (deleteTimeout.current) {
      clearTimeout(deleteTimeout.current);
      deleteTimeout.current = null;
    }
  }

  function resetUnprotectConfirmation() {
    setUnprotectArmed(false);

    if (unprotectTimeout.current) {
      clearTimeout(unprotectTimeout.current);
      unprotectTimeout.current = null;
    }
  }

  function handlePinChange(value: string) {
    setPinInput(sanitizePin(value));
    setPinError(null);
  }

  async function handleUnlockSubmit(event: FormEvent) {
    event.preventDefault();
    setPinError(null);

    if (pinInput.length !== PIN_MAX_LENGTH) {
      setPinError("PIN inválido");
      return;
    }

    if (!activePasteId) return;

    const response = await fetch(`/api/pastes/${activePasteId}/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pin: pinInput }),
    });

    if (response.status === 401) {
      setPinError("PIN incorreto");
      setPinInput("");
      return;
    }

    if (!response.ok) {
      setPinError("Não foi possível abrir.");
      setPinInput("");
      return;
    }

    const data = await response.json();
    const pin = pinInput;

    setActivePastePin(pin);
    setContentHtml(data.contentHtml ?? "");
    setStatus("idle");
    setPinInput("");
    setPinError(null);

    requestAnimationFrame(() => {
      requestEditorFocus();
    });
  }

  function handleProtectFirstSubmit(event: FormEvent) {
    event.preventDefault();
    setPinError(null);

    if (pinInput.length !== PIN_MAX_LENGTH) {
      setPinError("PIN inválido");
      return;
    }

    setFirstPin(pinInput);
    setPinInput("");
    setProtectStage("repeat");
  }

  async function handleProtectRepeatSubmit(event: FormEvent) {
    event.preventDefault();
    setPinError(null);

    if (pinInput !== firstPin) {
      setPinError("PIN diferente");
      setPinInput("");
      setFirstPin("");
      setProtectStage("first");
      return;
    }

    if (!activePasteId) return;

    const response = await fetch(`/api/pastes/${activePasteId}/protect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pin: firstPin }),
    });

    if (!response.ok) {
      setPinError("Não foi possível proteger.");
      setPinInput("");
      setFirstPin("");
      setProtectStage("first");
      return;
    }

    setPastes((previous) =>
      previous.map((paste) =>
        paste.id === activePasteId ? { ...paste, protected: true } : paste
      )
    );
    setActivePastePin(firstPin);
    setProtectStage("none");
    setPinInput("");
    setFirstPin("");
    setPinError(null);
    requestEditorFocus();
    await loadPastes();
  }

  async function handleUnprotect() {
    setMobileSidebarOpen(false);

    if (!unprotectArmed) {
      resetDeleteConfirmation();
      setUnprotectArmed(true);
      setPinError(null);

      if (unprotectTimeout.current) {
        clearTimeout(unprotectTimeout.current);
      }

      unprotectTimeout.current = setTimeout(() => {
        setUnprotectArmed(false);
        unprotectTimeout.current = null;
      }, 3000);

      return;
    }

    resetUnprotectConfirmation();

    if (!activePasteId || activePastePin === null) return;

    const response = await fetch(`/api/pastes/${activePasteId}/unprotect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pin: activePastePin }),
    });

    if (!response.ok) {
      setPinError("Não foi possível remover a proteção.");
      return;
    }

    setPastes((previous) =>
      previous.map((paste) =>
        paste.id === activePasteId ? { ...paste, protected: false } : paste
      )
    );
    setActivePastePin(null);
    setPinInput("");
    setPinError(null);
    requestEditorFocus();
    await loadPastes();
  }

  return (
    <main className="pasteboard">
      <header className="pasteboard-header">
        <button className="pasteboard-title" onMouseDown={(event) => event.preventDefault()} onClick={handleNewPaste}>
          Pasteboard
        </button>

        <div className="header-right">
          {isLocked && (
            <form key="unlock" className="pin-form" onSubmit={handleUnlockSubmit}>
              <span className="pin-form-label">protegido</span>
              <input
                className="pin-input"
                type="password"
                inputMode="numeric"
                maxLength={PIN_MAX_LENGTH}
                autoComplete="off"
                autoFocus
                value={pinInput}
                onChange={(event) => handlePinChange(event.target.value)}
                placeholder="PIN"
                aria-label="PIN"
              />
              {pinError && <span className="pin-error">{pinError}</span>}
            </form>
          )}

          {isUnlockedProtected && <span className="protected-label">protegido</span>}

          {canProtect && (
            <button
              className="protect-button"
              onClick={() => {
                resetUnprotectConfirmation();
                setPinInput("");
                setPinError(null);
                setProtectStage("first");
              }}
            >
              proteger
            </button>
          )}

          {protectStage === "first" && (
            <form key="protect-first" className="pin-form" onSubmit={handleProtectFirstSubmit}>
              <span className="pin-form-label">PIN</span>
              <input
                className="pin-input"
                type="password"
                inputMode="numeric"
                maxLength={PIN_MAX_LENGTH}
                autoComplete="off"
                autoFocus
                value={pinInput}
                onChange={(event) => handlePinChange(event.target.value)}
                onKeyDown={handleProtectKeyDown}
                placeholder="PIN"
                aria-label="PIN"
              />
              <button type="button" className="cancel-button" onClick={cancelProtectSetup}>
                cancelar
              </button>
              {pinError && <span className="pin-error">{pinError}</span>}
            </form>
          )}

          {protectStage === "repeat" && (
            <form key="protect-repeat" className="pin-form" onSubmit={handleProtectRepeatSubmit}>
              <span className="pin-form-label">repetir PIN</span>
              <input
                className="pin-input"
                type="password"
                inputMode="numeric"
                maxLength={PIN_MAX_LENGTH}
                autoComplete="off"
                autoFocus
                value={pinInput}
                onChange={(event) => handlePinChange(event.target.value)}
                onKeyDown={handleProtectKeyDown}
                placeholder="PIN"
                aria-label="PIN"
              />
              <button type="button" className="cancel-button" onClick={cancelProtectSetup}>
                cancelar
              </button>
              {pinError && <span className="pin-error">{pinError}</span>}
            </form>
          )}

          <span className="save-status">
            {status === "saving" && "salvando..."}
            {status === "saved" && "salvo"}
          </span>
        </div>
      </header>

      <div className="pasteboard-body">
        <Sidebar pastes={pastes} activePasteId={activePasteId} onSelectPaste={handleSelectPaste} pasteCount={pastes.length} mobileOpen={mobileSidebarOpen} />

        {isLocked ? (
          <section className="editor-column locked" />
        ) : (
          <section
            className="editor-column"
            onPointerDown={(event) => {
              const target = event.target as HTMLElement;

              const clickedInsideEditor = target.closest(".ProseMirror");
              const clickedToolbar = target.closest(".toolbar");
              const clickedDeleteButton = target.closest(".delete-button");
              const clickedMobileFooter = target.closest(".mobile-footer");

              if (clickedInsideEditor || clickedToolbar || clickedDeleteButton || clickedMobileFooter) {
                return;
              }

              event.preventDefault();
              setMobileSidebarOpen(false);
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

            <footer className="editor-footer desktop-footer">
              <span className="line-count">{lineCount} linhas</span>

              <div className="footer-actions">
                {isUnlockedProtected && pinError && <span className="pin-error">{pinError}</span>}

                {isUnlockedProtected && (
                  <button className={unprotectArmed ? "delete-button armed" : "delete-button"} onClick={handleUnprotect}>
                    {unprotectArmed ? "confirmar?" : "remover proteção"}
                  </button>
                )}

                <button className={deleteArmed ? "delete-button armed" : "delete-button"} onClick={handleDelete}>
                  {deleteArmed ? "confirmar?" : "excluir"}
                </button>
              </div>
            </footer>
          </section>
        )}
      </div>

      <footer className="mobile-footer">
        <button className="mobile-footer-button" onClick={handleToggleMobileSidebar}>
          {pastes.length} {pastes.length === 1 ? "paste" : "pastes"}
        </button>

        {!isLocked && <span>{lineCount} linhas</span>}

        {!isLocked && (
          <div className="footer-actions">
            {isUnlockedProtected && pinError && <span className="pin-error">{pinError}</span>}

            {isUnlockedProtected && (
              <button className={unprotectArmed ? "delete-button armed" : "delete-button"} onClick={handleUnprotect}>
                {unprotectArmed ? "confirmar?" : "remover proteção"}
              </button>
            )}

            <button className={deleteArmed ? "delete-button armed" : "delete-button"} onClick={handleDelete}>
              {deleteArmed ? "confirmar?" : "excluir"}
            </button>
          </div>
        )}
      </footer>
    </main>
  );
}
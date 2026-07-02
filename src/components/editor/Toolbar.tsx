import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

type ToolbarProps = {
  editor: Editor | null;
  showLineNumbers: boolean;
  onToggleLineNumbers: () => void;
};

export default function Toolbar({ editor, showLineNumbers, onToggleLineNumbers }: ToolbarProps) {
  const [isHeading, setIsHeading] = useState(false);

  useEffect(() => {
    if (!editor) {
      setIsHeading(false);
      return;
    }

    const activeEditor = editor;

    function updateCurrentTextStyle() {
      setIsHeading(activeEditor.isActive("heading", { level: 2 }));
    }

    updateCurrentTextStyle();

    activeEditor.on("selectionUpdate", updateCurrentTextStyle);
    activeEditor.on("transaction", updateCurrentTextStyle);

    return () => {
      activeEditor.off("selectionUpdate", updateCurrentTextStyle);
      activeEditor.off("transaction", updateCurrentTextStyle);
    };
  }, [editor]);

  if (!editor) return null;

  const activeEditor = editor;

  return (
    <nav className="toolbar">
      <button onClick={() => activeEditor.chain().focus().toggleBold().run()}>𝐁</button>

      <button onClick={() => activeEditor.chain().focus().toggleItalic().run()}>𝐼</button>

      <button onClick={() => activeEditor.chain().focus().toggleUnderline().run()}>u̲</button>

      <button onClick={() => activeEditor.chain().focus().toggleBulletList().run()}>•</button>

      <button onClick={() => activeEditor.chain().focus().toggleOrderedList().run()}>1.</button>

      <button onClick={() => activeEditor.chain().focus().sinkListItem("listItem").run()}>→</button>

      <button onClick={() => activeEditor.chain().focus().liftListItem("listItem").run()}>←</button>

      <button aria-label="Lista de tarefas" title="Lista de tarefas" onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <span className="toolbar-check-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <rect x="2.5" y="2.5" width="11" height="11" />
            <path d="M5 8.2L7.1 10.3L11.2 5.8" />
          </svg>
        </span>
      </button>

      <button onClick={() => activeEditor.chain().focus().toggleHighlight().run()}>marcador</button>

      <button className={showLineNumbers ? "toolbar-active" : ""} onClick={onToggleLineNumbers}>
        nº
      </button>

      <button
        className={isHeading ? "toolbar-text-style active" : "toolbar-text-style"}
        title={isHeading ? "Transformar em corpo de texto" : "Transformar em título"}
        onClick={() => {
          if (isHeading) {
            activeEditor.chain().focus().setParagraph().run();
            setIsHeading(false);
            return;
          }

          activeEditor.chain().focus().toggleHeading({ level: 2 }).run();
          setIsHeading(true);
        }}
      >
        {isHeading ? "título" : "corpo de texto"}
      </button>
    </nav>
  );
}

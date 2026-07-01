import type { Editor } from "@tiptap/react";

type ToolbarProps = {
  editor: Editor | null;
  showLineNumbers: boolean;
  onToggleLineNumbers: () => void;
};

export default function Toolbar({ editor, showLineNumbers, onToggleLineNumbers }: ToolbarProps) {
  if (!editor) return null;

  return (
    <nav className="toolbar">
      <button onClick={() => editor.chain().focus().toggleBold().run()}>B</button>

      <button onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>

      <button onClick={() => editor.chain().focus().toggleUnderline().run()}>U</button>

      <button onClick={() => editor.chain().focus().toggleBulletList().run()}>•</button>

      <button onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</button>

      <button onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>→</button>

      <button onClick={() => editor.chain().focus().liftListItem("listItem").run()}>←</button>

      <button onClick={() => editor.chain().focus().toggleTaskList().run()}>☑</button>

      <button className={showLineNumbers ? "toolbar-active" : ""} onClick={onToggleLineNumbers}>
        nº
      </button>

      <button onClick={() => editor.chain().focus().toggleHighlight().run()}>marcador</button>

      <button onClick={() => editor.chain().focus().setParagraph().run()}>texto</button>

      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>título</button>
    </nav>
  );
}

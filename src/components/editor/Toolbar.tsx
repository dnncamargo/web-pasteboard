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
      <button 
        aria-label="Negrito" 
        title="Negrito" 
        onClick={() => editor.chain().focus().toggleBold().run()}>
        𝐁
      </button>

      <button 
        aria-label="Itálico" 
        title="Itálico" 
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        𝑰
      </button>

      <button 
        aria-label="Sublinhado" 
        title="Sublinhado" 
        onClick={() => editor.chain().focus().toggleUnderline().run()}>
        u̲
      </button>

      <button 
        aria-label="Tópicos" 
        title="Tópicos" 
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        •
      </button>

      <button 
        aria-label="Lista numerada" 
        title="Lista numerada" 
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1.
      </button>

      <button 
        aria-label="Recuar item da lista"
        title="Recuar item da lista"
        onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
        →
      </button>

      <button 
        aria-label="Avançar item da lista"
        title="Avançar item da lista"
        onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
        ←
      </button>

      <button 
        aria-label="Lista de tarefas" 
        title="Lista de tarefas" 
        onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <span className="toolbar-check-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <rect x="2.5" y="2.5" width="11" height="11" />
            <path d="M5 8.2L7.1 10.3L11.2 5.8" />
          </svg>
        </span>
      </button>

      <button 
        aria-label="Números de linha"
        title="Números de linha"
        className={showLineNumbers ? "toolbar-active" : ""} onClick={onToggleLineNumbers}>
        nº
      </button>

      <button 
        aria-label="Marcador"
        title="Marcador"
        onClick={() => editor.chain().focus().toggleHighlight().run()}>
        marcador
      </button>

      <button 
        aria-label="Texto"
        title="Texto"
        onClick={() => editor.chain().focus().setParagraph().run()}>
        texto
      </button>

      <button 
        aria-label="Título"
        title="Título"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        título
      </button>
    </nav>
  );
}

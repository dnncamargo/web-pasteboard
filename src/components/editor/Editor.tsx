"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Toolbar from "./Toolbar";

type EditorProps = {
  contentHtml: string;
  showLineNumbers: boolean;
  onChange: (html: string) => void;
  onLineCountChange: (count: number) => void;
  onToggleLineNumbers: () => void;
  focusToken: number;
};

type LineMarker = {
  number: number;
  top: number;
};

export default function Editor({ contentHtml, showLineNumbers, focusToken, onChange, onLineCountChange, onToggleLineNumbers }: EditorProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [lineMarkers, setLineMarkers] = useState<LineMarker[]>([]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: contentHtml,
    editorProps: {
      attributes: {
        class: "editor-area",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
      requestAnimationFrame(updateLineMarkers);
    },
  });

  function updateLineMarkers() {
    const wrap = wrapRef.current;
    const editorElement = wrap?.querySelector(".ProseMirror");

    if (!wrap || !editorElement) return;

    const editorRect = editorElement.getBoundingClientRect();

    const blocks = editorElement.querySelectorAll("p, h1, h2, h3, blockquote, li");

    const markers: LineMarker[] = [];

    blocks.forEach((block, index) => {
      const rect = block.getBoundingClientRect();

      markers.push({
        number: index + 1,
        top: rect.top - editorRect.top,
      });
    });

    if (markers.length === 0) {
      markers.push({
        number: 1,
        top: 0,
      });
    }

    setLineMarkers(markers);
    onLineCountChange(markers.length);
  }

  useEffect(() => {
    if (!editor) return;

    if (editor.getHTML() !== contentHtml) {
      editor.commands.setContent(contentHtml || "");
    }

    requestAnimationFrame(updateLineMarkers);
  }, [contentHtml, editor]);

  useEffect(() => {
    if (!editor) return;

    requestAnimationFrame(() => {
      editor.commands.focus("end");
    });
  }, [editor, focusToken]);

  useEffect(() => {
    requestAnimationFrame(updateLineMarkers);

    window.addEventListener("resize", updateLineMarkers);

    return () => {
      window.removeEventListener("resize", updateLineMarkers);
    };
  }, [editor, showLineNumbers]);

  return (
    <div className="editor-shell">
      <Toolbar editor={editor} showLineNumbers={showLineNumbers} onToggleLineNumbers={onToggleLineNumbers} />

      <div className="editor-wrap" ref={wrapRef}>
        {showLineNumbers && (
          <div className="line-numbers" aria-hidden="true">
            <div className="line-numbers-inner">
              {lineMarkers.map((line) => (
                <span key={line.number} style={{ top: `${line.top}px` }}>
                  {line.number}
                </span>
              ))}
            </div>
          </div>
        )}

        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

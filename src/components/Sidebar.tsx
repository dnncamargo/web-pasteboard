import { Paste } from "@/types/paste";

type SidebarProps = {
  pastes: Paste[];
  activePasteId: string | null;
  pasteCount: number;
  onSelectPaste: (paste: Paste) => void;
};

export default function Sidebar({
  pastes,
  activePasteId,
  pasteCount,
  onSelectPaste,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-list">
        {pastes.map((paste) => (
          <button
            key={paste.id}
            className={
              paste.id === activePasteId
                ? "paste-preview active"
                : "paste-preview"
            }
            onClick={() => onSelectPaste(paste)}
          >
            {paste.preview || "Sem conteúdo"}
          </button>
        ))}
      </div>

      <footer className="sidebar-footer">
        {pasteCount} {pasteCount === 1 ? "paste" : "pastes"}
      </footer>
    </aside>
  );
}
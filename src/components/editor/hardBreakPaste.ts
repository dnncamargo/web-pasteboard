import { Fragment, Slice } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";

function readDataPmSlice(html: string | null) {
  if (!html) return null;

  const match = html.match(/data-pm-slice\s*=\s*["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function isHardBreakOnlyParagraph(state: EditorState) {
  const { $from } = state.selection;
  const parent = $from.parent;

  if (!(state.selection instanceof TextSelection) || !state.selection.empty) return false;
  if (parent.type.name !== "paragraph" || parent.childCount === 0) return false;
  if ($from.parentOffset <= 0 || $from.parentOffset >= parent.content.size) return false;

  for (let index = 0; index < parent.childCount; index += 1) {
    if (parent.child(index).type.name !== "hardBreak") return false;
  }

  return true;
}

function isInlineBoundarySlice(slice: Slice, html: string | null) {
  const dataPmSlice = readDataPmSlice(html);

  if (!dataPmSlice || !/^1\s+1(?:\s|$)/.test(dataPmSlice)) return false;
  if (slice.openStart !== 0 || slice.openEnd !== 0) return false;

  let paragraphIndex = -1;

  for (let index = 0; index < slice.content.childCount; index += 1) {
    const node = slice.content.child(index);

    if (node.type.name === "paragraph") {
      if (paragraphIndex !== -1) return false;
      paragraphIndex = index;
      continue;
    }

    if (node.type.name !== "hardBreak") return false;
  }

  if (paragraphIndex <= 0 || paragraphIndex >= slice.content.childCount - 1) return false;

  const leadingCount = paragraphIndex;
  const trailingCount = slice.content.childCount - paragraphIndex - 1;

  return leadingCount >= 1 && trailingCount >= 2;
}

export function normalizeHardBreakPaste(state: EditorState, slice: Slice, html: string | null) {
  if (!isHardBreakOnlyParagraph(state) || !isInlineBoundarySlice(slice, html)) return null;

  const paragraph = slice.content.child(
    Array.from({ length: slice.content.childCount }, (_, index) => index).find(
      (index) => slice.content.child(index).type.name === "paragraph",
    ) ?? 0,
  );

  return new Slice(Fragment.from(paragraph), 1, 1);
}

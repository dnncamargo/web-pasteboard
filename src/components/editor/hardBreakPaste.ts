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

function isMalformedInlineBoundarySlice(slice: Slice, html: string | null) {
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

  return leadingCount >= 1 && trailingCount >= 1;
}

function isSameParagraphSelection(state: EditorState) {
  const { $from, $to } = state.selection;

  return Boolean(
    state.selection instanceof TextSelection &&
      $from.parent === $to.parent &&
      $from.parent.type.name === "paragraph",
  );
}

function isCompleteTaskList(node: Slice["content"]["firstChild"]) {
  if (!node || node.type.name !== "taskList" || node.childCount === 0) return false;

  return Array.from({ length: node.childCount }, (_, index) => node.child(index)).every((taskItem) => {
    return taskItem.type.name === "taskItem" && taskItem.childCount > 0;
  });
}

function isOpenTaskListBoundarySlice(slice: Slice, html: string | null) {
  const dataPmSlice = readDataPmSlice(html);
  const taskList = slice.content.firstChild;
  const trailingNode = slice.content.childCount === 2 ? slice.content.lastChild : null;

  return Boolean(
    dataPmSlice &&
      /^3\s+1(?:\s|$)/.test(dataPmSlice) &&
      slice.openStart === 3 &&
      slice.openEnd === 1 &&
      slice.content.childCount === 2 &&
      isCompleteTaskList(taskList) &&
      trailingNode?.type.name === "paragraph" &&
      trailingNode.childCount === 0,
  );
}

function normalizeTaskListPaste(state: EditorState, slice: Slice, html: string | null) {
  if (!isHardBreakOnlyParagraph(state) || !isOpenTaskListBoundarySlice(slice, html)) return null;

  return new Slice(Fragment.from(slice.content.firstChild), 0, 0);
}

export function normalizeHardBreakPaste(state: EditorState, slice: Slice, html: string | null) {
  const taskListSlice = normalizeTaskListPaste(state, slice, html);

  if (taskListSlice) return taskListSlice;
  if (!isSameParagraphSelection(state) || !isMalformedInlineBoundarySlice(slice, html)) return null;

  const paragraph = slice.content.child(
    Array.from({ length: slice.content.childCount }, (_, index) => index).find(
      (index) => slice.content.child(index).type.name === "paragraph",
    ) ?? 0,
  );

  return new Slice(paragraph.content, 0, 0);
}

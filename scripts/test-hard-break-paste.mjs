import assert from "node:assert/strict";
import { test } from "node:test";
import { Fragment, Schema, Slice } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { normalizeHardBreakPaste } from "../src/components/editor/hardBreakPaste.ts";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    text: { group: "inline" },
    hardBreak: { inline: true, group: "inline", selectable: false },
    taskList: { content: "paragraph+", group: "block" },
  },
  marks: {
    bold: {},
    italic: {},
    underline: {},
    highlight: {},
  },
});

const html = '<p data-pm-slice="1 1 []">write a phrase here</p>';

function node(type, content = []) {
  return schema.nodes[type].create(null, content);
}

function hardBreakSlice(content = [schema.text("write a phrase here")]) {
  const paragraph = node("paragraph", content);
  return new Slice(Fragment.from([node("hardBreak"), paragraph, node("hardBreak"), node("hardBreak")]), 0, 0);
}

function stateFor(content, selectionPosition) {
  const doc = schema.nodes.doc.create(null, [node("paragraph", content)]);
  return EditorState.create({
    doc,
    selection: TextSelection.create(doc, selectionPosition),
  });
}

function apply(state, slice) {
  const normalized = normalizeHardBreakPaste(state, slice, html);
  assert.ok(normalized);
  return state.apply(state.tr.replaceSelection(normalized)).doc.toJSON();
}

test("fixes the proven hard-break-only destination", () => {
  const state = stateFor([node("hardBreak"), node("hardBreak")], 2);

  assert.deepEqual(apply(state, hardBreakSlice()), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "hardBreak" },
          { type: "text", text: "write a phrase here" },
          { type: "hardBreak" },
        ],
      },
    ],
  });
});

test("preserves marks and intentional hard breaks inside copied content", () => {
  const bold = schema.marks.bold.create();
  const content = [schema.text("bold", [bold]), node("hardBreak"), schema.text("italic", [schema.marks.italic.create()])];
  const state = stateFor([node("hardBreak"), node("hardBreak")], 2);

  assert.deepEqual(apply(state, hardBreakSlice(content)), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "hardBreak" },
          { type: "text", marks: [{ type: "bold" }], text: "bold" },
          { type: "hardBreak" },
          { type: "text", marks: [{ type: "italic" }], text: "italic" },
          { type: "hardBreak" },
        ],
      },
    ],
  });
});

test("does not normalize ordinary destinations", () => {
  const empty = stateFor([], 1);
  const ordinary = stateFor([schema.text("existing")], 4);

  assert.equal(normalizeHardBreakPaste(empty, hardBreakSlice(), html), null);
  assert.equal(normalizeHardBreakPaste(ordinary, hardBreakSlice(), html), null);
});

test("preserves all pre-existing hard breaks at different cursor positions", () => {
  const state = stateFor([node("hardBreak"), node("hardBreak"), node("hardBreak")], 3);

  assert.deepEqual(apply(state, hardBreakSlice()), {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "hardBreak" },
          { type: "hardBreak" },
          { type: "text", text: "write a phrase here" },
          { type: "hardBreak" },
        ],
      },
    ],
  });
});

test("does not normalize block slices or allow self-propagation", () => {
  const state = stateFor([node("hardBreak"), node("hardBreak")], 2);
  const taskListSlice = new Slice(Fragment.from(node("taskList", [node("paragraph", [schema.text("task")])])), 0, 0);

  assert.equal(normalizeHardBreakPaste(state, taskListSlice, html), null);

  const firstDoc = apply(state, hardBreakSlice());
  const firstState = EditorState.create({ doc: schema.nodeFromJSON(firstDoc) });
  assert.equal(normalizeHardBreakPaste(firstState, hardBreakSlice(), html), null);
});

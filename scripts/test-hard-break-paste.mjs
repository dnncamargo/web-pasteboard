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
    taskList: { content: "taskItem+", group: "block" },
    taskItem: { attrs: { checked: { default: false } }, content: "paragraph (taskList | paragraph)*", defining: true },
  },
  marks: { bold: {}, italic: {}, underline: {}, highlight: {} },
});

const inlineHtml = '<p data-pm-slice="1 1 []">write a phrase here</p>';
const taskListHtml = '<ul data-type="taskList" data-pm-slice="3 1 []"><li data-type="taskItem"><p>Cebola</p></li></ul><p></p>';
const names = ["Cebola", "Tomate", "Batata", "Cenoura", "Beterraba", "Abóbora", "Abobrinha", "Couve", "Banana", "Batata doce"];
const checked = [true, true, true, false, true, false, true, true, true, false];

function node(type, content = [], attrs = null) { return schema.nodes[type].create(attrs, content); }
function hardBreaks(count) { return Array.from({ length: count }, () => node("hardBreak")); }
function taskItem(name, isChecked, content = [schema.text(name)]) { return node("taskItem", [node("paragraph", content)], { checked: isChecked }); }
function taskList(items = names.map((name, index) => taskItem(name, checked[index]))) { return node("taskList", items); }
function destination(breakCount = 2, cursorAfter = breakCount - 1) {
  const doc = node("doc", [node("paragraph", hardBreaks(breakCount))]);
  return EditorState.create({ doc, selection: TextSelection.create(doc, 1 + cursorAfter) });
}
function activeParagraphSelection(text = "health check", fromOffset = 0, toOffset = text.length) {
  const doc = node("doc", [node("paragraph", [schema.text(text)]), node("paragraph", [schema.text(text)])]);
  const secondParagraphStart = doc.child(0).nodeSize;
  const from = secondParagraphStart + 1 + fromOffset;
  const to = secondParagraphStart + 1 + toOffset;
  return EditorState.create({ doc, selection: TextSelection.create(doc, from, to) });
}
function activeInlineSlice(content = [schema.text("health check")]) {
  return new Slice(Fragment.from([node("hardBreak"), node("paragraph", content), node("hardBreak"), node("hardBreak")]), 0, 0);
}
function latestEmptyParagraphState() {
  const doc = node("doc", [node("paragraph", [schema.text("a")]), node("paragraph")]);
  return EditorState.create({ doc, selection: TextSelection.create(doc, 4) });
}
function oneTrailingBoundarySlice(content = [schema.text("a")]) {
  return new Slice(Fragment.from([node("hardBreak"), node("paragraph", content), node("hardBreak")]), 0, 0);
}
function taskListSlice(list = taskList()) { return new Slice(Fragment.from([list, node("paragraph")]), 3, 1); }
function replace(state, slice) { return state.apply(state.tr.replaceSelection(slice)); }
function expectedDocument(list, beforeBreaks = 1, afterBreaks = 1) { return node("doc", [node("paragraph", hardBreaks(beforeBreaks)), list, node("paragraph", hardBreaks(afterBreaks))]).toJSON(); }
function taskListFromDoc(doc) {
  for (let index = 0; index < doc.childCount; index += 1) if (doc.child(index).type.name === "taskList") return doc.child(index);
  return null;
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }

test("proves the exact default transaction reproduces the original corruption", () => {
  const result = replace(destination(), taskListSlice());
  assert.deepEqual(plain(result.doc.toJSON()), { type: "doc", content: [
    { type: "paragraph", content: [{ type: "hardBreak" }, { type: "text", text: "Cebola" }] },
    { type: "taskList", content: names.slice(1).map((name, index) => ({ type: "taskItem", attrs: { checked: checked[index + 1] }, content: [{ type: "paragraph", content: [{ type: "text", text: name }] }] })) },
    { type: "paragraph", content: [{ type: "hardBreak" }] },
  ] });
});

test("fixes the exact open task-list paste with all ten task items", () => {
  const state = destination();
  const normalized = normalizeHardBreakPaste(state, taskListSlice(), taskListHtml);
  assert.ok(normalized);
  assert.equal(normalized.openStart, 0);
  assert.equal(normalized.openEnd, 0);
  const result = replace(state, normalized);
  assert.deepEqual(result.doc.toJSON(), expectedDocument(taskList()));
  assert.equal(taskListFromDoc(result.doc).childCount, 10);
});

test("preserves the first item, mixed checked states, and no empty task item", () => {
  const state = destination();
  const list = taskList();
  const normalized = normalizeHardBreakPaste(state, taskListSlice(list), taskListHtml);
  const pastedList = taskListFromDoc(replace(state, normalized).doc);
  assert.equal(pastedList.firstChild.firstChild.textContent, "Cebola");
  assert.deepEqual(Array.from({ length: pastedList.childCount }, (_, index) => pastedList.child(index).attrs.checked), checked);
  assert.equal(Array.from({ length: pastedList.childCount }, (_, index) => pastedList.child(index).childCount).includes(0), false);
});

test("preserves nested task items and marks by reusing the parsed taskList node", () => {
  const bold = schema.marks.bold.create();
  const nested = node("taskList", [taskItem("Nested", false)]);
  const list = taskList([taskItem("Cebola", true, [schema.text("Cebola", [bold])]), node("taskItem", [node("paragraph", [schema.text("Tomate")]), nested], { checked: true }), ...names.slice(2).map((name, index) => taskItem(name, checked[index + 2]))]);
  const state = destination();
  const normalized = normalizeHardBreakPaste(state, taskListSlice(list), taskListHtml);
  const pastedList = taskListFromDoc(replace(state, normalized).doc);
  assert.deepEqual(pastedList.toJSON(), list.toJSON());
});

test("preserves multiple destination hard breaks", () => {
  const state = destination(3, 2);
  const normalized = normalizeHardBreakPaste(state, taskListSlice(), taskListHtml);
  assert.deepEqual(replace(state, normalized).doc.toJSON(), expectedDocument(taskList(), 2, 1));
});

test("does not intercept normal destinations or closed task-list slices", () => {
  const list = taskList();
  const normalEmpty = EditorState.create({ doc: node("doc", [node("paragraph")]) });
  const normalText = EditorState.create({ doc: node("doc", [node("paragraph", [schema.text("existing")])]) });
  const closed = new Slice(Fragment.from(list), 0, 0);
  assert.equal(normalizeHardBreakPaste(normalEmpty, taskListSlice(), taskListHtml), null);
  assert.equal(normalizeHardBreakPaste(normalText, taskListSlice(), taskListHtml), null);
  assert.equal(normalizeHardBreakPaste(destination(), closed, taskListHtml), null);
});

test("keeps the existing inline hard-break behavior", () => {
  const state = destination();
  const paragraph = node("paragraph", [schema.text("write a phrase here")]);
  const inlineSlice = new Slice(Fragment.from([node("hardBreak"), paragraph, node("hardBreak"), node("hardBreak")]), 0, 0);
  const normalized = normalizeHardBreakPaste(state, inlineSlice, inlineHtml);
  assert.ok(normalized);
  assert.deepEqual(replace(state, normalized).doc.toJSON(), { type: "doc", content: [{ type: "paragraph", content: [{ type: "hardBreak" }, { type: "text", text: "write a phrase here" }, { type: "hardBreak" }] }] });
});

test("proves the exact default transaction reproduces active-selection corruption", () => {
  const state = activeParagraphSelection();
  const result = replace(state, activeInlineSlice());

  assert.deepEqual(result.doc.toJSON(), { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "health check" }] },
    { type: "paragraph", content: [{ type: "hardBreak" }] },
    { type: "paragraph", content: [{ type: "text", text: "health check" }] },
    { type: "paragraph", content: [{ type: "hardBreak" }, { type: "hardBreak" }] },
  ] });
});

test("proves the latest empty-paragraph capture reproduces the default corruption", () => {
  const result = replace(latestEmptyParagraphState(), activeInlineSlice([schema.text("a")]));

  assert.deepEqual(result.doc.toJSON(), { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "a" }] },
    { type: "paragraph", content: [{ type: "hardBreak" }] },
    { type: "paragraph", content: [{ type: "text", text: "a" }] },
    { type: "paragraph", content: [{ type: "hardBreak" }, { type: "hardBreak" }] },
  ] });
});

test("normalizes the latest empty-paragraph capture to two ordinary paragraphs", () => {
  const state = latestEmptyParagraphState();
  const normalized = normalizeHardBreakPaste(state, activeInlineSlice([schema.text("a")]), '<p data-pm-slice="1 1 []">a</p>');

  assert.ok(normalized);
  assert.deepEqual(replace(state, normalized).doc.toJSON(), {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "a" }] },
      { type: "paragraph", content: [{ type: "text", text: "a" }] },
    ],
  });
});

test("normalizes a malformed inline Slice into a collapsed hard-break-only paragraph", () => {
  const state = destination();
  const normalized = normalizeHardBreakPaste(state, activeInlineSlice([schema.text("a")]), '<p data-pm-slice="1 1 []">a</p>');

  assert.deepEqual(replace(state, normalized).doc.toJSON(), {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "hardBreak" }, { type: "text", text: "a" }, { type: "hardBreak" }] }],
  });
});

test("normalizes a malformed inline Slice at a collapsed cursor in normal text", () => {
  const doc = node("doc", [node("paragraph", [schema.text("hello  world")])]);
  const state = EditorState.create({ doc, selection: TextSelection.create(doc, 7) });
  const normalized = normalizeHardBreakPaste(state, activeInlineSlice([schema.text("a")]), '<p data-pm-slice="1 1 []">a</p>');

  assert.deepEqual(replace(state, normalized).doc.toJSON(), {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "hello a world" }] }],
  });
});

test("normalizes a malformed inline Slice over a partial text selection", () => {
  const doc = node("doc", [node("paragraph", [schema.text("hello world")])]);
  const state = EditorState.create({ doc, selection: TextSelection.create(doc, 7, 12) });
  const normalized = normalizeHardBreakPaste(state, activeInlineSlice([schema.text("a")]), '<p data-pm-slice="1 1 []">a</p>');

  assert.deepEqual(replace(state, normalized).doc.toJSON(), {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "hello a" }] }],
  });
});

test("accepts a single trailing synthetic boundary and preserves the semantic content", () => {
  const normalized = normalizeHardBreakPaste(latestEmptyParagraphState(), oneTrailingBoundarySlice(), '<p data-pm-slice="1 1 []">a</p>');

  assert.deepEqual(replace(latestEmptyParagraphState(), normalized).doc.toJSON(), {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "a" }] },
      { type: "paragraph", content: [{ type: "text", text: "a" }] },
    ],
  });
});

test("leaves healthy 1/1 and normal 0/0 clipboard Slices untouched", () => {
  const state = latestEmptyParagraphState();
  const paragraph = node("paragraph", [schema.text("a")]);

  assert.equal(normalizeHardBreakPaste(state, new Slice(Fragment.from(paragraph), 1, 1), '<p data-pm-slice="1 1 []">a</p>'), null);
  assert.equal(normalizeHardBreakPaste(state, new Slice(Fragment.from(paragraph), 0, 0), '<p>a</p>'), null);
});

test("does not normalize a cross-paragraph selection", () => {
  const doc = node("doc", [node("paragraph", [schema.text("one")]), node("paragraph", [schema.text("two")])]);
  const state = EditorState.create({ doc, selection: TextSelection.create(doc, 1, doc.content.size - 1) });

  assert.equal(normalizeHardBreakPaste(state, activeInlineSlice([schema.text("a")]), '<p data-pm-slice="1 1 []">a</p>'), null);
});

test("keeps Ctrl+C then Ctrl+V over a whole paragraph selection structurally idempotent", () => {
  const state = activeParagraphSelection();
  const normalized = normalizeHardBreakPaste(state, activeInlineSlice(), inlineHtml);

  assert.ok(normalized);
  assert.deepEqual(normalized.content.toJSON(), [{ type: "text", text: "health check" }]);
  assert.deepEqual(replace(state, normalized).doc.toJSON(), state.doc.toJSON());
});

test("normalizes a malformed inline Slice over a partial text selection", () => {
  const state = activeParagraphSelection("health check", 7, 12);
  const normalized = normalizeHardBreakPaste(state, activeInlineSlice([schema.text("check")]), inlineHtml);

  assert.deepEqual(replace(state, normalized).doc.toJSON(), {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "health check" }] },
      { type: "paragraph", content: [{ type: "text", text: "health check" }] },
    ],
  });
});

test("preserves marks in active whole-paragraph selection normalization", () => {
  const bold = schema.marks.bold.create();
  const state = activeParagraphSelection("health check");
  const normalized = normalizeHardBreakPaste(state, activeInlineSlice([schema.text("health check", [bold])]), inlineHtml);

  assert.deepEqual(replace(state, normalized).doc.toJSON(), {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "health check" }] },
      { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "health check" }] },
    ],
  });
});

test("preserves an intentional hardBreak inside the semantic paragraph", () => {
  const state = activeParagraphSelection("health check");
  const content = [schema.text("health"), node("hardBreak"), schema.text("check")];
  const normalized = normalizeHardBreakPaste(state, activeInlineSlice(content), inlineHtml);

  assert.deepEqual(replace(state, normalized).doc.toJSON(), {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "health check" }] },
      { type: "paragraph", content: [{ type: "text", text: "health" }, { type: "hardBreak" }, { type: "text", text: "check" }] },
    ],
  });
});

test("does not normalize a selection spanning two paragraphs", () => {
  const doc = node("doc", [node("paragraph", [schema.text("health")]), node("paragraph", [schema.text("check")])]);
  const spanning = EditorState.create({ doc, selection: TextSelection.create(doc, 1, doc.content.size - 1) });

  assert.equal(normalizeHardBreakPaste(spanning, activeInlineSlice(), inlineHtml), null);
});

test("normalizes a malformed inline Slice at a collapsed cursor in a normal paragraph", () => {
  const doc = node("doc", [node("paragraph", [schema.text("health check")])]);
  const state = EditorState.create({ doc, selection: TextSelection.create(doc, 4) });

  assert.ok(normalizeHardBreakPaste(state, activeInlineSlice(), inlineHtml));
});

test("does not self-propagate after a corrected paste", () => {
  const state = destination();
  const normalized = normalizeHardBreakPaste(state, taskListSlice(), taskListHtml);
  const first = replace(state, normalized);
  assert.equal(normalizeHardBreakPaste(first, taskListSlice(), taskListHtml), null);
});

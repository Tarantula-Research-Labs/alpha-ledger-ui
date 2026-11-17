"use client";

// Rich editor for one research record (TipTap): headings, bold/italic/strike, lists, checkboxes,
// links and code blocks. Normal cut, copy and paste work as in any editor.
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { EXTENSIONS } from "./extensions";
import { looksLikeMarkdown, markdownToHtml } from "./markdown";
import r from "./records.module.css";

function Toolbar({ editor }: { editor: Editor }) {
  const on = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      code: e.isActive("codeBlock"),
      link: e.isActive("link"),
    }),
  });
  const chain = () => editor.chain().focus();
  const link = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address (leave empty to remove)", prev ?? "https://");
    if (url === null) return;
    if (!url) chain().extendMarkRange("link").unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: url }).run();
  };
  const items: [string, string, boolean, () => void][] = [
    ["H1", "Heading 1", on.h1, () => chain().toggleHeading({ level: 1 }).run()],
    ["H2", "Heading 2", on.h2, () => chain().toggleHeading({ level: 2 }).run()],
    ["B", "Bold (Ctrl+B)", on.bold, () => chain().toggleBold().run()],
    ["I", "Italic (Ctrl+I)", on.italic, () => chain().toggleItalic().run()],
    ["S", "Strike-through (Ctrl+Shift+S)", on.strike, () => chain().toggleStrike().run()],
    ["•", "Bullet list", on.bullet, () => chain().toggleBulletList().run()],
    ["1.", "Numbered list", on.ordered, () => chain().toggleOrderedList().run()],
    ["☐", "Checkbox list", on.task, () => chain().toggleTaskList().run()],
    ["</>", "Code block", on.code, () => chain().toggleCodeBlock().run()],
    ["🔗", "Link", on.link, link],
  ];
  return (
    <div className={r.toolbar} role="toolbar" aria-label="Formatting">
      {items.map(([label, title, active, run]) => (
        <button key={title} type="button" title={title} aria-label={title} aria-pressed={active} className={r.tool} onMouseDown={(e) => e.preventDefault()} onClick={run}>
          {label}
        </button>
      ))}
      <span className={r.toolGap} />
      <button type="button" title="Undo (Ctrl+Z)" aria-label="Undo" className={r.tool} onClick={() => chain().undo().run()}>
        ↶
      </button>
      <button type="button" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" className={r.tool} onClick={() => chain().redo().run()}>
        ↷
      </button>
    </div>
  );
}

export function RecordEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (doc: Record<string, unknown>) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(onChange);
  const editorRef = useRef<Editor | null>(null);
  latest.current = onChange;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [...EXTENSIONS, Placeholder.configure({ placeholder: "Write your findings, ideas, to-dos…" })],
    content,
    editorProps: {
      attributes: { class: r.prose, "aria-label": "Record text" },
      // Pasted Markdown becomes formatted text (inside a code block it stays as typed).
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (!editorRef.current || view.state.selection.$from.parent.type.name === "codeBlock" || !looksLikeMarkdown(text)) return false;
        editorRef.current.commands.insertContent(markdownToHtml(text));
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      // Saved half a second after you stop typing.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => latest.current(e.getJSON() as Record<string, unknown>), 500);
    },
  });
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  // Save what's pending when switching records or leaving the page.
  useEffect(
    () => () => {
      if (timer.current && editor) {
        clearTimeout(timer.current);
        latest.current(editor.getJSON() as Record<string, unknown>);
      }
    },
    [editor],
  );
  if (!editor) return <div className={r.prose} />;
  return (
    <>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </>
  );
}

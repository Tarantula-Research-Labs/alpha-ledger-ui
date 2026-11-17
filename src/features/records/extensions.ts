// The editor's building blocks, shared by the editor and the read-only preview (so both agree).
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";

export const EXTENSIONS = [StarterKit.configure({ link: { openOnClick: false, autolink: true } }), TaskList, TaskItem.configure({ nested: true })];

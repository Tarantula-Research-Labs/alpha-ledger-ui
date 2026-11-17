// Pasted Markdown → HTML the editor understands (headings, lists, checkboxes, bold, code).
import { marked } from "marked";

const MD_HINT = /^(\s*[-*+] |\s*\d+[.)] |#{1,6} |```|> )|\*\*[^*\n]+\*\*|~~[^~\n]+~~|`[^`\n]+`/m;

/** True when plain text looks like Markdown worth converting. */
export const looksLikeMarkdown = (text: string) => MD_HINT.test(text);

/** Markdown to HTML; GitHub-style checkboxes become the editor's checkbox lists. */
const LIST_ITEM = /^\s*([-*+]|\d+[.)]) /;

/** A plain line right after a list item starts a new paragraph (Markdown would fold it into the item). */
function separateLines(md: string): string {
  const lines = md.split(/\r?\n/);
  return lines.map((line, i) => (i > 0 && line.trim() && !/^\s/.test(line) && !LIST_ITEM.test(line) && LIST_ITEM.test(lines[i - 1]) ? `\n${line}` : line)).join("\n");
}

export function markdownToHtml(md: string): string {
  const html = marked.parse(separateLines(md), { gfm: true, breaks: true, async: false }) as string;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  doc.querySelectorAll("li").forEach((li) => {
    const box = li.querySelector(":scope > input[type=checkbox], :scope > p > input[type=checkbox]");
    if (!box) return;
    li.setAttribute("data-type", "taskItem");
    li.setAttribute("data-checked", String((box as HTMLInputElement).checked));
    const next = box.nextSibling;
    box.remove();
    if (next?.nodeType === Node.TEXT_NODE) next.textContent = (next.textContent ?? "").replace(/^\s+/, "");
  });
  doc.querySelectorAll("ul").forEach((ul) => {
    const items = [...ul.children];
    if (items.length && items.every((li) => li.getAttribute("data-type") === "taskItem")) ul.setAttribute("data-type", "taskList");
  });
  return doc.body.firstElementChild?.innerHTML ?? html;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { inputClass } from "@/core/ui";
import { buildFolders, fileName, startOpen, type Folder, type StudyFile } from "./study";
import st from "./study.module.css";

const KIND_LABEL = { pdf: "PDF", notebook: "NB", image: "IMG", text: "TXT" } as const;

interface BranchProps {
  folder: Folder;
  open: Set<string>;
  toggle: (path: string) => void;
  /** While searching, every folder with a match stays open. */
  forceOpen: boolean;
  selected: string | null;
  onSelect: (path: string) => void;
}

// One folder's contents: its sub-folders first, then its files.
function Branch({ folder, open, toggle, forceOpen, selected, onSelect }: BranchProps) {
  return (
    <ul className={st.list}>
      {folder.folders.map((f) => {
        const isOpen = forceOpen || open.has(f.path);
        return (
          <li key={f.path}>
            <button type="button" className={st.row} aria-expanded={isOpen} onClick={() => toggle(f.path)}>
              <span className={st.chevron} data-open={isOpen || undefined} aria-hidden="true">
                ›
              </span>
              <span className={st.folderName}>{f.name}</span>
              {f.flagged > 0 && <span className={st.dot} role="img" aria-label={`${f.flagged} new or updated`} title={`${f.flagged} new or updated`} />}
            </button>
            {isOpen && (
              <div className={st.children}>
                <Branch folder={f} open={open} toggle={toggle} forceOpen={forceOpen} selected={selected} onSelect={onSelect} />
              </div>
            )}
          </li>
        );
      })}
      {folder.files.map((f) => (
        <li key={f.path}>
          <button
            type="button"
            className={st.row}
            data-selected={f.path === selected || undefined}
            aria-current={f.path === selected ? "true" : undefined}
            title={f.path}
            onClick={() => onSelect(f.path)}
          >
            <span className={st.kind}>{KIND_LABEL[f.kind]}</span>
            <span className={st.fileName}>{fileName(f.path)}</span>
            {f.badge && (
              <span className={st.badge} data-badge={f.badge}>
                {f.badge === "new" ? "New" : "Updated"}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

// The course folders as a tree, with a search box. Folders start closed (except a lone top folder).
export function FileTree({ files, selected, onSelect }: { files: StudyFile[]; selected: string | null; onSelect: (path: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(() => startOpen(buildFolders(files)));
  const q = query.trim().toLowerCase();

  // Opening a file (a fresh upload, or a link with ?file=) opens the folders it sits in.
  useEffect(() => {
    if (!selected) return;
    const parts = selected.split("/").slice(0, -1);
    setOpen((prev) => {
      const next = new Set(prev);
      parts.forEach((_, i) => next.add(parts.slice(0, i + 1).join("/")));
      return next;
    });
  }, [selected]);

  const root = useMemo(() => buildFolders(q ? files.filter((f) => f.path.toLowerCase().includes(q)) : files), [files, q]);
  const empty = root.folders.length === 0 && root.files.length === 0;

  function toggle(path: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  return (
    <>
      <div className={st.search}>
        <input
          className={inputClass}
          type="search"
          placeholder="Search files"
          aria-label="Search files"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className={st.treeScroll}>
        {empty ? (
          <p className={st.none}>No files match.</p>
        ) : (
          <Branch folder={root} open={open} toggle={toggle} forceOpen={q !== ""} selected={selected} onSelect={onSelect} />
        )}
      </div>
    </>
  );
}

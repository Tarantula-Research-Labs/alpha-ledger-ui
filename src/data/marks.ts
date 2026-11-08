"use client";

// Section drafts ("Draft 1", "Draft 2", ...) for one experiment, from the server.
// Shared across the experiment's workspace, so the sidebar, dashboard and section pages always agree.
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { useLedger } from "./LedgerProvider";

export interface Mark {
  id: number;
  section: string;
  draft: number;
  note: string;
  createdAt: string;
}

interface ServerMark {
  id: number;
  section: string;
  draft: number;
  note: string;
  created_at: string;
}

const toMark = (m: ServerMark): Mark => ({ id: m.id, section: m.section, draft: m.draft, note: m.note, createdAt: m.created_at });
const messageOf = (e: unknown) => (e instanceof ApiError ? e.message : "The server can't be reached.");

/** The latest draft of a section, or undefined. */
export function latestMark(marks: Mark[], section: string): Mark | undefined {
  return marks.filter((m) => m.section === section).sort((a, b) => b.draft - a.draft)[0];
}

/** Completed = has a draft. In progress ("current") = the first active section without one. Upcoming = the rest. */
export type SectionState = "completed" | "current" | "upcoming" | "skipped";

export function sectionStates(sections: { folder: string; active: boolean }[], marks: Mark[]): Record<string, SectionState> {
  const out: Record<string, SectionState> = {};
  let currentFound = false;
  for (const s of sections) {
    if (!s.active) {
      out[s.folder] = "skipped";
    } else if (marks.some((m) => m.section === s.folder)) {
      out[s.folder] = "completed";
    } else {
      out[s.folder] = currentFound ? "upcoming" : "current";
      currentFound = true;
    }
  }
  return out;
}

interface MarksValue {
  marks: Mark[];
  error: string | null;
  /** Returns an error message, or null when saved. */
  addMark: (section: string, note: string) => Promise<string | null>;
  /** Returns an error message, or null when hidden. */
  hideMark: (section: string, id: number) => Promise<string | null>;
}

const MarksContext = createContext<MarksValue | null>(null);

export function MarksProvider({ experiment, children }: { experiment: string; children: ReactNode }) {
  const { server } = useLedger();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await apiRequest<ServerMark[]>(`/experiments/${experiment}/marks`);
      setMarks(list.map(toMark));
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    }
  }, [experiment]);

  // Load once the server is up (and again whenever it comes back up).
  useEffect(() => {
    if (server === "ready") void refresh();
  }, [server, refresh]);

  const addMark = useCallback(
    async (section: string, note: string) => {
      try {
        await apiRequest(`/experiments/${experiment}/sections/${section}/marks`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ note }),
        });
      } catch (e) {
        return messageOf(e);
      }
      await refresh();
      return null;
    },
    [experiment, refresh],
  );

  const hideMark = useCallback(
    async (section: string, id: number) => {
      try {
        await apiRequest(`/experiments/${experiment}/sections/${section}/marks/${id}`, { method: "DELETE" });
      } catch (e) {
        return messageOf(e);
      }
      await refresh();
      return null;
    },
    [experiment, refresh],
  );

  const value = useMemo(() => ({ marks, error, addMark, hideMark }), [marks, error, addMark, hideMark]);
  return createElement(MarksContext.Provider, { value }, children);
}

export function useMarks(): MarksValue {
  const value = useContext(MarksContext);
  if (!value) throw new Error("useMarks must be used inside <MarksProvider>");
  return value;
}

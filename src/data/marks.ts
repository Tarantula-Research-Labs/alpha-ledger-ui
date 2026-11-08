"use client";

// Section drafts ("Draft 1", "Draft 2", ...) for one experiment, from the server.
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/core/api";

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

export function useMarks(experiment: string) {
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Returns an error message, or null when saved. */
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

  /** Returns an error message, or null when hidden. */
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

  return { marks, error, addMark, hideMark };
}

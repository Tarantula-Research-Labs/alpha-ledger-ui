"use client";

// Playlists: YouTube playlists you add by link, and playlists of your own made of single videos.
// The server reads YouTube (public and unlisted playlists only) and keeps each playlist's video list in S3.
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/core/api";
import { useLedger } from "@/data/LedgerProvider";

export const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export interface PlaylistCard {
  id: string;
  /** "youtube" = added by link (Refresh reads it again); "mine" = made here, videos added one by one. */
  kind: "youtube" | "mine";
  title: string;
  channel: string;
  thumbnail: string;
  videoCount: number;
  totalSeconds: number;
  createdAt: string;
  refreshedAt: string | null;
}

export interface PlaylistVideo {
  videoId: string;
  title: string;
  channel: string;
  durationSeconds: number;
  thumbnail: string;
  /** False when the video's owner blocks playing it outside YouTube. */
  embeddable: boolean;
}

export interface Playlist extends PlaylistCard {
  videos: PlaylistVideo[];
}

interface ServerCard {
  id: string;
  kind: "youtube" | "mine";
  title: string;
  channel: string;
  thumbnail: string;
  video_count: number;
  total_seconds: number;
  created_at: string;
  refreshed_at: string | null;
}

interface ServerVideo {
  video_id: string;
  title: string;
  channel: string;
  duration_seconds: number;
  thumbnail: string;
  embeddable: boolean;
}

type ServerPlaylist = ServerCard & { videos: ServerVideo[] };

const toCard = (c: ServerCard): PlaylistCard => ({
  id: c.id,
  kind: c.kind,
  title: c.title,
  channel: c.channel,
  thumbnail: c.thumbnail,
  videoCount: c.video_count,
  totalSeconds: c.total_seconds,
  createdAt: c.created_at,
  refreshedAt: c.refreshed_at,
});

const toPlaylist = (p: ServerPlaylist): Playlist => ({
  ...toCard(p),
  videos: p.videos.map((v) => ({
    videoId: v.video_id,
    title: v.title,
    channel: v.channel,
    durationSeconds: v.duration_seconds,
    thumbnail: v.thumbnail,
    embeddable: v.embeddable,
  })),
});

// The server's list comes from an eventually consistent index, so for a moment after a change it can miss a new playlist,
// show an old count or still show a removed one. What this browser has just seen from the server wins.
const fresh = new Map<string, PlaylistCard>();
const hidden = new Set<string>();

/** The card part of a playlist (everything but its videos). */
export const cardOf = (p: Playlist): PlaylistCard => ({
  id: p.id,
  kind: p.kind,
  title: p.title,
  channel: p.channel,
  thumbnail: p.thumbnail,
  videoCount: p.videoCount,
  totalSeconds: p.totalSeconds,
  createdAt: p.createdAt,
  refreshedAt: p.refreshedAt,
});

const remember = (p: Playlist): Playlist => {
  fresh.set(p.id, cardOf(p));
  hidden.delete(p.id);
  return p;
};

export async function listPlaylists(): Promise<PlaylistCard[]> {
  const r = await apiRequest<{ playlists: ServerCard[] }>("/playlists");
  const cards = new Map(r.playlists.map((c) => [c.id, toCard(c)]));
  for (const [id, card] of fresh) cards.set(id, card);
  for (const id of hidden) cards.delete(id);
  return [...cards.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Add a YouTube playlist from its link. Name, channel, thumbnail and videos come from YouTube. */
export async function importPlaylist(url: string): Promise<Playlist> {
  return remember(toPlaylist(await apiRequest<ServerPlaylist>("/playlists/import", { method: "POST", body: JSON.stringify({ url }) })));
}

/** Make an empty playlist of your own. */
export async function createPlaylist(title: string): Promise<Playlist> {
  return remember(toPlaylist(await apiRequest<ServerPlaylist>("/playlists", { method: "POST", body: JSON.stringify({ title }) })));
}

export async function getPlaylist(id: string): Promise<Playlist> {
  return remember(toPlaylist(await apiRequest<ServerPlaylist>(`/playlists/${encodeURIComponent(id)}`)));
}

/** Read a YouTube playlist again. Also says how many videos are new and how many are gone. */
export async function refreshPlaylist(id: string): Promise<{ playlist: Playlist; added: number; removed: number }> {
  const r = await apiRequest<ServerPlaylist & { new: number; removed: number }>(`/playlists/${encodeURIComponent(id)}/refresh`, { method: "POST" });
  return { playlist: remember(toPlaylist(r)), added: r.new, removed: r.removed };
}

/** Rename one of your own playlists. */
export async function renamePlaylist(id: string, title: string): Promise<void> {
  const r = await apiRequest<ServerCard>(`/playlists/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ title }) });
  fresh.set(id, toCard(r));
}

/** Hide a playlist. Its video list stays in storage, and adding the same YouTube link again brings it back. */
export async function removePlaylist(id: string): Promise<void> {
  await apiRequest(`/playlists/${encodeURIComponent(id)}`, { method: "DELETE" });
  fresh.delete(id);
  hidden.add(id);
}

/** Add one video, by its link, to the end of one of your own playlists. */
export async function addVideo(id: string, url: string): Promise<Playlist> {
  return remember(toPlaylist(await apiRequest<ServerPlaylist>(`/playlists/${encodeURIComponent(id)}/videos`, { method: "POST", body: JSON.stringify({ url }) })));
}

/** Take one video out of one of your own playlists. */
export async function removeVideo(id: string, videoId: string): Promise<Playlist> {
  return remember(toPlaylist(await apiRequest<ServerPlaylist>(`/playlists/${encodeURIComponent(id)}/videos/${encodeURIComponent(videoId)}`, { method: "DELETE" })));
}

/** The playlists the server shows, newest first. Loads once the server answers. */
export function usePlaylists() {
  const { server } = useLedger();
  const [cards, setCards] = useState<PlaylistCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setCards(await listPlaylists());
      setError(null);
    } catch (e) {
      setError(errorText(e, "The server can't be reached."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (server === "ready") void reload();
  }, [server, reload]);

  /** A playlist was just added: show it at once (the server's list can lag a moment). */
  const added = useCallback((p: Playlist) => {
    setCards((c) => [cardOf(p), ...(c ?? []).filter((x) => x.id !== p.id)]);
  }, []);

  return { cards, loading, error, reload, added };
}

/** One playlist with its videos. Loads once the server answers; `set` replaces it after a change. */
export function usePlaylist(id: string) {
  const { server } = useLedger();
  const [playlist, set] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; missing: boolean } | null>(null);

  const reload = useCallback(async () => {
    try {
      set(await getPlaylist(id));
      setError(null);
    } catch (e) {
      setError({ message: errorText(e, "The server can't be reached."), missing: e instanceof ApiError && e.status === 404 });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    set(null);
    setLoading(true);
    if (server === "ready") void reload();
  }, [server, reload]);

  return { playlist, loading, error, reload, set };
}

/* ---------- Formatting ---------- */

/** A video's length: 4:05 or 1:02:03. */
export function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/** A playlist's total length: 31 h 57 min, 2 h, 45 min. */
export function totalLength(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? (m > 0 ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

export const videoCount = (n: number) => `${n} ${n === 1 ? "video" : "videos"}`;

export const watchUrl = (videoId: string, playlistId?: string) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}${playlistId ? `&list=${encodeURIComponent(playlistId)}` : ""}`;

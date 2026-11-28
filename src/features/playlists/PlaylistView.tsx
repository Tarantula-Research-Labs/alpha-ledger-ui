"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Dialog, EmptyState, PageHeader } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { ServerGate } from "@/features/experiments/ServerGate";
import { TextDialog } from "./PlaylistDialogs";
import { Player } from "./Player";
import { addVideo, clock, errorText, refreshPlaylist, removePlaylist, removeVideo, renamePlaylist, totalLength, usePlaylist, videoCount, watchUrl } from "./playlists";
import pl from "./playlists.module.css";

// One playlist: the player and the video that is open on one side, the list of videos on the other.
// The open video is in the address bar (?v=), so a refresh keeps your place. When a video ends, the next one starts.
// A YouTube playlist can be refreshed; one of your own can be renamed and have videos added and taken out.
export function PlaylistView({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { playlist, loading, error, reload, set } = usePlaylist(id);

  const [autoplay, setAutoplay] = useState(false); // false until you pick a video (or one finishes): a page that has just opened waits for Play
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState<{ text: string; failed: boolean } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (noteTimer.current && clearTimeout(noteTimer.current)), []);

  const videos = playlist?.videos ?? [];
  const wanted = params.get("v");
  const index = Math.max(0, videos.findIndex((v) => v.videoId === wanted));
  const current = videos[index] ?? null;

  // Keep the open video in view in the list (it moves on by itself when one ends).
  useEffect(() => {
    const l = list.current;
    const row = l?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!l || !row) return;
    if (row.offsetTop < l.scrollTop || row.offsetTop + row.offsetHeight > l.scrollTop + l.clientHeight) {
      l.scrollTop = row.offsetTop - l.clientHeight / 2 + row.offsetHeight / 2;
    }
  }, [current?.videoId]);

  function open(videoId: string) {
    setAutoplay(true);
    if (videoId === current?.videoId) return;
    router.replace(`/playlists/${encodeURIComponent(id)}?v=${encodeURIComponent(videoId)}`, { scroll: false });
  }

  // A click on the list, or Previous / Next: on a narrow screen, bring the player into view too.
  function pick(videoId: string) {
    open(videoId);
    if (window.matchMedia("(max-width: 1100px)").matches) stage.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function ended() {
    const next = videos[index + 1];
    if (next) open(next.videoId);
  }

  async function refresh() {
    setRefreshing(true);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    try {
      const r = await refreshPlaylist(id);
      set(r.playlist);
      setNote({ text: r.added === 0 && r.removed === 0 ? "Up to date" : `${r.added} new, ${r.removed} removed`, failed: false });
      noteTimer.current = setTimeout(() => setNote(null), 10_000);
    } catch (e) {
      setNote({ text: errorText(e, "The refresh failed."), failed: true });
    } finally {
      setRefreshing(false);
    }
  }

  async function takeOut(videoId: string) {
    try {
      set(await removeVideo(id, videoId));
    } catch (e) {
      setNote({ text: errorText(e, "Couldn't remove the video."), failed: true });
    }
  }

  async function confirmRemove() {
    setRemoveBusy(true);
    try {
      await removePlaylist(id);
      router.push("/playlists");
    } catch (e) {
      setRemoveError(errorText(e, "Couldn't remove the playlist."));
      setRemoveBusy(false);
    }
  }

  const mine = playlist?.kind === "mine";
  const back = { href: "/playlists", label: "All playlists" };

  if (!playlist) {
    return (
      <div className={pl.page}>
        <PageHeader title="Playlist" back={back} />
        <ServerGate>
          {loading ? (
            <GearSpinner label="Loading the playlist…" />
          ) : error?.missing ? (
            <EmptyState title="This playlist isn't here" action={<ButtonLink href="/playlists">All playlists</ButtonLink>}>
              <p>It may have been removed.</p>
            </EmptyState>
          ) : (
            <EmptyState title="The playlist couldn't be loaded." action={<Button onClick={() => void reload()}>Try again</Button>}>
              <p>{error?.message}</p>
            </EmptyState>
          )}
        </ServerGate>
      </div>
    );
  }

  const actions = (
    <div className={pl.actions}>
      {note && (
        <span className={pl.note} data-failed={note.failed || undefined} role="status">
          {note.text}
        </span>
      )}
      {mine ? (
        <>
          <Button variant="primary" onClick={() => setAddingVideo(true)}>
            Add video
          </Button>
          <Button onClick={() => setRenaming(true)}>Rename</Button>
        </>
      ) : (
        <Button variant="primary" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      )}
      <Button
        variant="quiet"
        onClick={() => {
          setRemoveError(null);
          setRemoving(true);
        }}
      >
        Remove
      </Button>
    </div>
  );

  return (
    <div className={pl.page}>
      <PageHeader
        title={playlist.title}
        back={back}
        sub={`${mine ? "Your playlist" : playlist.channel} · ${videoCount(playlist.videoCount)}${playlist.videoCount > 0 ? ` · ${totalLength(playlist.totalSeconds)}` : ""}`}
        actions={actions}
      />
      <ServerGate>
        {!current ? (
          <EmptyState
            title="No videos in this playlist"
            action={mine ? <Button variant="primary" onClick={() => setAddingVideo(true)}>Add a video</Button> : undefined}
          >
            <p>{mine ? "Paste the link of a YouTube video to add it." : "YouTube returned no playable videos. Refresh if the playlist has changed."}</p>
          </EmptyState>
        ) : (
          <div className={pl.view}>
            <div className={pl.stage} ref={stage}>
              <Player video={current} playlistId={mine ? undefined : playlist.id} autoplay={autoplay} onEnded={ended} />
              <div className={pl.nowPlaying}>
                <h2>{current.title}</h2>
                <p>
                  {current.channel} · {clock(current.durationSeconds)}
                </p>
                <div className={pl.nowActions}>
                  <Button onClick={() => pick(videos[index - 1].videoId)} disabled={index === 0}>
                    ‹ Previous
                  </Button>
                  <Button onClick={() => pick(videos[index + 1].videoId)} disabled={index === videos.length - 1}>
                    Next ›
                  </Button>
                  <a className={pl.openLink} href={watchUrl(current.videoId, mine ? undefined : playlist.id)} target="_blank" rel="noreferrer">
                    Open on YouTube
                  </a>
                </div>
              </div>
            </div>
            <aside className={pl.listPane} aria-label="Videos">
              <div className={pl.listHead}>
                {videoCount(videos.length)} · {totalLength(playlist.totalSeconds)}
              </div>
              <ol className={pl.videoList} ref={list}>
                {videos.map((v, i) => (
                  <li key={v.videoId} className={pl.videoItem}>
                    <button type="button" className={pl.videoRow} aria-current={v.videoId === current.videoId ? "true" : undefined} onClick={() => pick(v.videoId)}>
                      <span className={pl.num}>{i + 1}</span>
                      <span className={pl.vthumb}>
                        {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" />}
                        <span className={pl.len}>{clock(v.durationSeconds)}</span>
                      </span>
                      <span className={pl.vtext}>
                        <span className={pl.vtitle}>{v.title}</span>
                        <span className={pl.vmeta}>
                          {v.channel}
                          {!v.embeddable && " · YouTube only"}
                        </span>
                      </span>
                    </button>
                    {mine && (
                      <button type="button" className={pl.vremove} aria-label={`Take “${v.title}” out of this playlist`} title="Take out of this playlist" onClick={() => void takeOut(v.videoId)}>
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        )}
      </ServerGate>
      <TextDialog
        open={addingVideo}
        onClose={() => setAddingVideo(false)}
        title="Add a video"
        label="Video link"
        placeholder="https://www.youtube.com/watch?v=…"
        hint="It goes to the end of this playlist."
        submit="Add video"
        busyText="Adding…"
        onSubmit={async (url) => set(await addVideo(id, url))}
      />
      <TextDialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename playlist"
        label="Name"
        initial={playlist.title}
        submit="Save"
        busyText="Saving…"
        onSubmit={async (title) => {
          await renamePlaylist(id, title);
          set({ ...playlist, title });
        }}
      />
      <Dialog open={removing} onClose={() => !removeBusy && setRemoving(false)} title="Remove this playlist?">
        <div className={pl.form}>
          <p>
            <strong>{playlist.title}</strong> will disappear from Playlists.{" "}
            {mine ? "Its videos stay in storage, but a playlist of your own can't be brought back from the app." : "Its list stays in storage, and adding the same link again brings it back."}
          </p>
          {removeError && (
            <p className={pl.hint} data-failed role="alert">
              {removeError}
            </p>
          )}
          <div className={pl.dialogActions}>
            <Button variant="quiet" onClick={() => setRemoving(false)} disabled={removeBusy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void confirmRemove()} disabled={removeBusy}>
              {removeBusy ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { watchUrl, type PlaylistVideo } from "./playlists";
import pl from "./playlists.module.css";

// The part of YouTube's player script that this page uses.
interface YTPlayer {
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  stopVideo(): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      host: string;
      playerVars: Record<string, number>;
      events: { onReady: () => void; onStateChange: (e: { data: number }) => void };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const ENDED = 0; // YouTube's player state for "the video finished"
let apiPromise: Promise<YTNamespace> | null = null;

// YouTube's player script is fetched once, the first time a playlist opens.
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("The YouTube player script didn't load."));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

interface Props {
  video: PlaylistVideo;
  /** A YouTube playlist's id, so Open on YouTube continues in that playlist. Your own playlists have none. */
  playlistId?: string;
  /** True once you have picked a video (or one has finished): the video then starts by itself instead of waiting for Play. */
  autoplay: boolean;
  /** The video finished. */
  onEnded: () => void;
}

// The YouTube player for the open video. When one ends, onEnded moves on to the next. A video whose owner blocks playing it
// outside YouTube shows its thumbnail and a link instead. If YouTube's script can't load (an ad blocker, say), a plain
// embedded player is used: it plays, but doesn't move on by itself.
export function Player({ video, playlistId, autoplay, onEnded }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const ended = useRef(onEnded);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  ended.current = onEnded;

  // Create the player once.
  useEffect(() => {
    let cancelled = false;
    let created: YTPlayer | null = null;
    const slot = document.createElement("div");
    host.current?.appendChild(slot);
    loadYouTubeApi().then(
      (YT) => {
        if (cancelled) return;
        created = new YT.Player(slot, {
          host: "https://www.youtube-nocookie.com",
          playerVars: { rel: 0, playsinline: 1 },
          events: {
            onReady: () => {
              if (cancelled) return;
              player.current = created;
              setReady(true);
            },
            onStateChange: (e) => {
              if (e.data === ENDED) ended.current();
            },
          },
        });
      },
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
      player.current = null;
      setReady(false);
      try {
        created?.destroy();
      } catch {
        // already gone
      }
      slot.remove();
    };
  }, []);

  // Show the open video: it starts at once after you pick one, and waits for Play when the page has only just opened.
  useEffect(() => {
    const p = player.current;
    if (!ready || !p) return;
    if (!video.embeddable) p.stopVideo();
    else if (autoplay) p.loadVideoById(video.videoId);
    else p.cueVideoById(video.videoId);
  }, [ready, video.videoId, video.embeddable, autoplay]);

  return (
    <div className={pl.player}>
      {failed && video.embeddable && (
        <iframe
          key={video.videoId}
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}?rel=0&playsinline=1${autoplay ? "&autoplay=1" : ""}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )}
      <div ref={host} className={pl.playerHost} hidden={failed || !video.embeddable} />
      {!video.embeddable && (
        <div className={pl.blocked}>
          {video.thumbnail && <img src={video.thumbnail} alt="" />}
          <div>
            <p>The owner of this video doesn&apos;t allow it to play outside YouTube.</p>
            <a className={pl.openLink} href={watchUrl(video.videoId, playlistId)} target="_blank" rel="noreferrer">
              Open on YouTube
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, EmptyState, PageHeader } from "@/core/ui";
import { GearSpinner } from "@/core/ui/GearSpinner";
import { PlaylistsIcon } from "@/core/ui/icons";
import { ServerGate } from "@/features/experiments/ServerGate";
import { TextDialog } from "./PlaylistDialogs";
import { createPlaylist, importPlaylist, totalLength, usePlaylists, videoCount, type PlaylistCard } from "./playlists";
import pl from "./playlists.module.css";

function Card({ card }: { card: PlaylistCard }) {
  return (
    <Link href={`/playlists/${encodeURIComponent(card.id)}`} className={pl.card}>
      <div className={pl.thumb}>
        {card.thumbnail ? (
          <img src={card.thumbnail} alt="" loading="lazy" />
        ) : (
          <span className={pl.thumbEmpty}>
            <PlaylistsIcon />
          </span>
        )}
        {card.kind === "mine" && <span className={pl.tag}>Mine</span>}
      </div>
      <div className={pl.cardBody}>
        <strong className={pl.cardTitle}>{card.title}</strong>
        <span className={pl.cardMeta}>{card.kind === "youtube" ? card.channel : "Your playlist"}</span>
        <span className={pl.cardMeta}>
          {videoCount(card.videoCount)}
          {card.videoCount > 0 && ` · ${totalLength(card.totalSeconds)}`}
        </span>
      </div>
    </Link>
  );
}

// Every playlist as a card; click one to open its videos. Add a YouTube playlist by link, or make your own.
export function PlaylistsPage() {
  const { cards, loading, error, reload, added } = usePlaylists();
  const [adding, setAdding] = useState(false);
  const [making, setMaking] = useState(false);

  const actions = (
    <div className={pl.actions}>
      <Button variant="primary" onClick={() => setAdding(true)}>
        Add playlist
      </Button>
      <Button onClick={() => setMaking(true)}>New playlist</Button>
    </div>
  );

  return (
    <div className={pl.page}>
      <PageHeader title="Playlists" sub="Your YouTube study playlists in one place, apart from everything else on YouTube." actions={actions} />
      <ServerGate>
        {loading ? (
          <GearSpinner label="Loading your playlists…" />
        ) : error ? (
          <EmptyState title="The playlists couldn't be loaded." action={<Button onClick={() => void reload()}>Try again</Button>}>
            <p>{error}</p>
          </EmptyState>
        ) : cards && cards.length === 0 ? (
          <EmptyState
            title="No playlists yet"
            action={
              <div className={pl.actions}>
                <Button variant="primary" onClick={() => setAdding(true)}>
                  Add a playlist
                </Button>
                <Button onClick={() => setMaking(true)}>New playlist</Button>
              </div>
            }
          >
            <p>Paste the link of a public or unlisted YouTube playlist and it appears here with its name and videos. Or make a playlist of your own and add single videos to it.</p>
          </EmptyState>
        ) : (
          <ul className={pl.grid}>
            {(cards ?? []).map((c) => (
              <li key={c.id}>
                <Card card={c} />
              </li>
            ))}
          </ul>
        )}
      </ServerGate>
      <TextDialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a YouTube playlist"
        label="Playlist link"
        placeholder="https://www.youtube.com/playlist?list=…"
        hint="Public or unlisted playlists only. The name, channel and videos come from YouTube."
        submit="Add playlist"
        busyText="Reading the playlist…"
        onSubmit={async (url) => added(await importPlaylist(url))}
      />
      <TextDialog
        open={making}
        onClose={() => setMaking(false)}
        title="New playlist"
        label="Name"
        placeholder="e.g. Stochastic calculus, to watch"
        hint="A playlist of your own. Open it afterwards and add single videos by link."
        submit="Create"
        busyText="Creating…"
        onSubmit={async (title) => added(await createPlaylist(title))}
      />
    </div>
  );
}

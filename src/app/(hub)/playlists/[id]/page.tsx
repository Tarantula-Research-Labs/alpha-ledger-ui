import type { Metadata } from "next";
import { Suspense } from "react";
import { PlaylistView } from "@/features/playlists/PlaylistView";

export const metadata: Metadata = { title: "Playlist" };

export default async function Playlist({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <PlaylistView id={id} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { PlaylistsPage } from "@/features/playlists/PlaylistsPage";

export const metadata: Metadata = { title: "Playlists" };

export default function Playlists() {
  return <PlaylistsPage />;
}

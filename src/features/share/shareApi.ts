// Share links for a research path. Creating, listing and revoking go through the server (signed in);
// the public page reads the frozen copy through /api/share/<code>, which needs no sign-in.
import { apiRequest } from "@/core/api";

export interface ShareMeta {
  code: string;
  experiment: string;
  section: string;
  path_id: string;
  path_title: string;
  zip: string;
  version: number;
  pushed_at: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
  revoked_at?: string;
}

export interface CreateShareBody {
  experiment: string;
  section: string;
  zip: string;
  version: number;
  mlflow_experiment: string;
  artifacts: string[];
  path_id: string;
  path_title: string;
  days: number;
}

export const createShare = (body: CreateShareBody) => apiRequest<ShareMeta>("/shares", { method: "POST", body: JSON.stringify(body) });
export const listShares = () => apiRequest<ShareMeta[]>("/shares");
export const revokeShare = (code: string) => apiRequest<ShareMeta>(`/shares/${code}`, { method: "DELETE" });

export const shareUrl = (code: string) => `${window.location.origin}/share/${code}`;

export function shareStatus(m: ShareMeta): "active" | "expired" | "revoked" {
  if (m.revoked) return "revoked";
  return new Date(m.expires_at).getTime() < Date.now() ? "expired" : "active";
}

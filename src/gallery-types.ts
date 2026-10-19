export type GalleryState = "pending" | "approved" | "rejected" | "deleted";
export type GalleryReason = "privacy" | "not-finished" | "rights" | "other";
export type GalleryPost = {
  id: string;
  title: string;
  alias: string;
  review: string;
  rating: number;
  thumbnail: string;
  publishedAt: number | null;
  expiresAt: number;
};
export type PrivateGalleryPost = GalleryPost & {
  state: GalleryState;
  revision: number;
  reason: GalleryReason | null;
  createdAt: number;
};
export type GalleryPage = {
  items: GalleryPost[];
  next: string | null;
  total: number;
  averageRating: number | null;
};
export const GALLERY_CONSENT = "finished-gallery/1";

// Files attached but not yet uploaded. Keyed by their blob: object-URL (used as
// the preview src). Uploaded in one batch on save (not at attach time).
export const pendingMedia = new Map<string, File>();

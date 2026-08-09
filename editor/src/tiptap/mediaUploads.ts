import { api } from '../lib/api';

// Media is uploaded the moment it is attached, NOT batched at save time.
//
// Attaching hands back a blob: object-URL to preview with; the POST /media that runs alongside it
// resolves to the real /files/media src, and whoever owns the preview swaps to it. Deferring the
// upload to save is what used to (a) keep every attached File alive for the whole session, (b) let
// undo resurrect a preview whose File had been dropped, and (c) make 저장 wait on N uploads.
//
// The registry owns the whole lifecycle. Callers never revoke: deleting a block or removing a
// gallery item does nothing here on purpose, so an undo that brings the node back still lands on a
// working src once its upload settles.
interface Upload {
  file?: File; // dropped once uploaded — this reference is what actually holds the image in memory
  promise: Promise<string>;
}

const uploads = new Map<string, Upload>(); // blob: URL → its upload

function run(url: string, entry: Upload, file: File) {
  entry.file = file;
  entry.promise = api.uploadMedia(file).then(({ src }) => {
    entry.file = undefined;
    // A macrotask after the subscribers' .then handlers have swapped src, so the preview never
    // blanks between "upload done" and "showing the uploaded image".
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return src;
  });
  // Failure keeps the File so 재시도 can re-send it. Swallowed here because the owner attaches its
  // own rejection handler; an unhandled rejection would surface as a console error either way.
  entry.promise.catch(() => {});
  return entry.promise;
}

/** Start uploading `file`; the returned blob: URL is its preview src until the upload resolves. */
export function attachMedia(file: File): string {
  const url = URL.createObjectURL(file);
  const entry: Upload = { promise: Promise.resolve('') };
  uploads.set(url, entry);
  run(url, entry, file);
  return url;
}

export interface MediaUpload {
  /** Resolves to the /files/media src. Rejects if the upload failed (retry with `retry`). */
  promise: Promise<string>;
  retry: () => Promise<string>;
}

/** The in-flight/finished upload behind a blob: src, or undefined for an already-uploaded src. */
export function mediaUpload(src: string | null | undefined): MediaUpload | undefined {
  if (!src?.startsWith('blob:')) return undefined;
  const entry = uploads.get(src);
  if (!entry) return undefined;
  return {
    promise: entry.promise,
    retry: () => (entry.file ? run(src, entry, entry.file) : entry.promise),
  };
}

// A blob: src survived the upload pass — its upload failed for good (or the registry never saw it,
// which only happens if an undo resurrected a node from before this session). Saving it would put
// a dead URL in the MDX, so the save stops here instead.
export class MediaNotUploadedError extends Error {
  constructor() {
    super('업로드에 실패한 이미지가 있습니다 — 재시도하거나 삭제한 뒤 저장해 주세요');
    this.name = 'MediaNotUploadedError';
  }
}

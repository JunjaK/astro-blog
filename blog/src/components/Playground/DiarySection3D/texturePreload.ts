// Shared texture cache and loader for DiaryGallery.
// Both DiaryTexturePreloader (client:idle) and UnifiedImagePlane (client:visible)
// import from this module, sharing the same cache singleton.

import * as THREE from 'three';

export const textureCache = new Map<string, THREE.Texture>();
const pendingLoads = new Map<string, Promise<THREE.Texture>>();

const loader = new THREE.TextureLoader();
loader.crossOrigin = '';

export const isMobileDevice =
  typeof window !== 'undefined'
  && (/Mobi|Android/i.test(navigator.userAgent) || window.screen.width < 768);

const MAX_TEXTURE_SIZE = isMobileDevice ? 1024 : 2048;

// --- Concurrency-limited loading queue ---
const CONCURRENCY = isMobileDevice ? 3 : 8;
let activeLoads = 0;
const queue: Array<() => void> = [];

function runNext() {
  while (activeLoads < CONCURRENCY && queue.length > 0) {
    activeLoads++;
    const next = queue.shift()!;
    next();
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(() => {
      fn().then(resolve, reject).finally(() => {
        activeLoads--;
        runNext();
      });
    });
    runNext();
  });
}

/** Canvas-based fallback for when createImageBitmap fails (e.g. iOS Safari). */
function downscaleWithCanvas(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas;
}

async function downscale(tex: THREE.Texture): Promise<void> {
  const img = tex.image as HTMLImageElement;
  if (!img || (img.width <= MAX_TEXTURE_SIZE && img.height <= MAX_TEXTURE_SIZE)) return;

  const scale = MAX_TEXTURE_SIZE / Math.max(img.width, img.height);
  const targetW = Math.round(img.width * scale);
  const targetH = Math.round(img.height * scale);

  try {
    // imageOrientation: 'flipY' bakes the vertical flip into the bitmap,
    // because WebGL's UNPACK_FLIP_Y_WEBGL doesn't work with ImageBitmap.
    const bitmap = await createImageBitmap(img, {
      resizeWidth: targetW,
      resizeHeight: targetH,
      resizeQuality: 'medium',
      imageOrientation: 'flipY',
    });
    tex.image = bitmap;
    tex.flipY = false;
  } catch {
    // createImageBitmap fails on iOS Safari — fall back to canvas downscaling.
    // Canvas path keeps flipY = true (default) since we don't flip manually.
    tex.image = downscaleWithCanvas(img, targetW, targetH);
  }

  tex.needsUpdate = true;
}

/** Internal: actually load and process a single texture. */
function loadTextureRaw(url: string): Promise<THREE.Texture> {
  return new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      async (tex) => {
        try {
          tex.colorSpace = THREE.SRGBColorSpace;
          await downscale(tex);
        } catch {
          // proceed without downscale
        }
        textureCache.set(url, tex);
        pendingLoads.delete(url);
        resolve(tex);
      },
      undefined,
      (err) => {
        pendingLoads.delete(url);
        reject(err);
      },
    );
  });
}

/** Load a single texture (with deduplication + concurrency limit). */
export function loadTexture(url: string): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached) return Promise.resolve(cached);

  const pending = pendingLoads.get(url);
  if (pending) return pending;

  const promise = enqueue(() => loadTextureRaw(url));
  pendingLoads.set(url, promise);
  return promise;
}

/** Fire-and-forget preload for a list of URLs. */
export function preloadTextures(urls: string[]): void {
  for (const url of urls) {
    loadTexture(url);
  }
}

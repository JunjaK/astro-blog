// Shared texture cache and loader for DiaryGallery.
// Both DiaryTexturePreloader (client:idle) and UnifiedImagePlane (client:visible)
// import from this module, sharing the same cache singleton.

import * as THREE from 'three';

export const textureCache = new Map<string, THREE.Texture>();
const pendingLoads = new Map<string, Promise<THREE.Texture>>();

const loader = new THREE.TextureLoader();
loader.crossOrigin = '';

const MAX_TEXTURE_SIZE = 1024;

async function downscale(tex: THREE.Texture): Promise<void> {
  const img = tex.image as HTMLImageElement;
  if (!img || (img.width <= MAX_TEXTURE_SIZE && img.height <= MAX_TEXTURE_SIZE)) return;

  const scale = MAX_TEXTURE_SIZE / Math.max(img.width, img.height);
  // imageOrientation: 'flipY' bakes the vertical flip into the bitmap,
  // because WebGL's UNPACK_FLIP_Y_WEBGL doesn't work with ImageBitmap.
  const bitmap = await createImageBitmap(img, {
    resizeWidth: Math.round(img.width * scale),
    resizeHeight: Math.round(img.height * scale),
    resizeQuality: 'medium',
    imageOrientation: 'flipY',
  });

  tex.image = bitmap;
  tex.flipY = false;
  tex.needsUpdate = true;
}

/** Load a single texture (with deduplication of in-flight requests). */
export function loadTexture(url: string): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached) return Promise.resolve(cached);

  const pending = pendingLoads.get(url);
  if (pending) return pending;

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      async (tex) => {
        try {
          tex.colorSpace = THREE.SRGBColorSpace;
          await downscale(tex);
        } catch {
          // createImageBitmap can fail on some browsers/cached resources — proceed without downscale
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

  pendingLoads.set(url, promise);
  return promise;
}

/** Fire-and-forget preload for a list of URLs. */
export function preloadTextures(urls: string[]): void {
  for (const url of urls) {
    loadTexture(url);
  }
}

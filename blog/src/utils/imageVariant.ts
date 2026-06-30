// Body-image variant URLs by convention: /files/a/foo.png → /files/a/foo-480.webp.
// Files produced by src/utils/generateVariants.js. Originals stay in MDX; components
// derive variant URLs here. Missing variant → caller's onError falls back to original.
const IMG_RE = /\.(png|jpe?g|webp)$/i;

export type VariantWidth = 480 | 960 | 1600;

export function variant(src: string, w: VariantWidth): string {
  if (!src.startsWith('/files/') || !IMG_RE.test(src)) return src;
  return src.replace(IMG_RE, `-${w}.webp`);
}

export function srcSet(src: string, widths: VariantWidth[] = [480, 960]): string | undefined {
  if (!src.startsWith('/files/') || !IMG_RE.test(src)) return undefined;
  return widths.map((w) => `${variant(src, w)} ${w}w`).join(', ');
}

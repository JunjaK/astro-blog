/**
 * Native image perf for markdown/MDX body images.
 *
 * Image-heavy posts loaded dozens of full-size (proxied 2k) images at once,
 * saturating the network and blocking the main thread on decode/paint — which
 * janks scrolling and the custom cursor. This adds:
 *   - loading="lazy"      → offscreen images don't fetch until near the viewport
 *   - decoding="async"    → decode off the main thread
 *   - content-visibility  → offscreen images skip layout/paint ("virtual scroll lite")
 *   - contain-intrinsic-size: auto 360px → reserve height so there's no scroll jump
 *
 * Only touches HTML <img> nodes in the content tree (markdown `![]()` and raw
 * <img> in MDX). Component images (ImageLoader, gallery islands) handle their own.
 */
const CV_STYLE = 'content-visibility:auto;contain-intrinsic-size:auto 360px';

function visit(node) {
  if (node.type === 'element' && node.tagName === 'img') {
    const props = node.properties ?? (node.properties = {});
    if (props.loading == null) props.loading = 'lazy';
    if (props.decoding == null) props.decoding = 'async';
    props.style = props.style ? `${props.style};${CV_STYLE}` : CV_STYLE;
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) visit(child);
  }
}

export default function rehypeImgAttrs() {
  return (tree) => visit(tree);
}

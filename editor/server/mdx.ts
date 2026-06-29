import remarkMdx from 'remark-mdx';
import { remark } from 'remark';

// Segment MDX body into prose runs vs verbatim component/special blocks, using
// real MDX-AST positions (not a line heuristic). Component regions are sliced
// from the ORIGINAL source → byte-preserved on round-trip.
export interface ModeledNode {
  name: string;
  attrs?: Record<string, string>;
  items?: { src: string; alt: string }[];
}
// `node` present only for a component we lift out of RawMdx into a rich editor node.
export interface Segment { kind: 'md' | 'raw'; src: string; node?: ModeledNode }

const RAW_NODE = new Set(['mdxjsEsm', 'mdxJsxFlowElement', 'mdxFlowExpression']);
const RAW_FENCE = new Set(['lyrics', 'mermaid']);

interface MdNode { type: string; lang?: string; position?: { start: { offset: number }; end: { offset: number } } }
interface MdxAttr { type: string; name?: string; value?: unknown }
interface MdxJsxNode extends MdNode { name?: string | null; attributes?: MdxAttr[]; children?: unknown[] }

// Components lifted into rich nodes. ImageLoader/VideoLoader: string-attr only.
const MODELED_ATTRS: Record<string, Set<string>> = {
  ImageLoader: new Set(['src', 'alt']),
  VideoLoader: new Set(['src']),
};
const ITEM_RE = /\{\s*src:\s*["']([^"']+)["']\s*(?:,\s*alt:\s*["']([^"']*)["'])?[^}]*\}/g;

// → a rich node payload, or undefined to keep the segment verbatim (RawMdx).
function modeledNode(node: MdxJsxNode): ModeledNode | undefined {
  if (node.type !== 'mdxJsxFlowElement' || !node.name) return;

  // DiaryCarousel content={[{src,alt}, …]} → gallery node (carousel). Bail on video items.
  if (node.name === 'DiaryCarousel') {
    const attr = (node.attributes ?? []).find((a) => a.type === 'mdxJsxAttribute' && a.name === 'content');
    const expr = (attr?.value as { value?: string } | undefined)?.value;
    if (typeof expr !== 'string' || /poster:|type:\s*["']video/.test(expr)) return;
    const items: { src: string; alt: string }[] = [];
    for (const m of expr.matchAll(ITEM_RE)) items.push({ src: m[1], alt: m[2] ?? '' });
    return items.length ? { name: 'DiaryCarousel', items } : undefined;
  }

  // ImageLoader / VideoLoader: childless, string-literal attrs only.
  const allowed = MODELED_ATTRS[node.name];
  if (!allowed) return;
  if (node.children && node.children.length) return;
  const attrs: Record<string, string> = {};
  for (const a of node.attributes ?? []) {
    if (a.type !== 'mdxJsxAttribute' || typeof a.name !== 'string') return; // spread
    if (typeof a.value !== 'string') return; // expression / boolean
    if (!allowed.has(a.name)) return; // unmodeled attr → keep verbatim (no data loss)
    attrs[a.name] = a.value;
  }
  return { name: node.name, attrs };
}

// Imports the editor manages automatically. The user never writes these — they're
// stripped on load (hidden) and regenerated on save from the components actually used.
export const IMPORTS: Record<string, string> = {
  DiaryCarousel: "import { DiaryCarousel } from '@/components/Blog/DiaryGallery';",
  PolaroidGalleryScrapbook: "import PolaroidGalleryScrapbook from '@/components/Blog/DiaryGallery/PolaroidGalleryScrapbook.astro';",
  TableOfContents: "import TableOfContents from '@/components/Blog/TableOfContents.astro';",
  MusicCard: "import MusicCard from '@/components/Blog/Music/MusicCard.astro';",
  ImageLoader: "import ImageLoader from '@/components/Blog/ImageLoader.astro';",
  VideoLoader: "import VideoLoader from '@/components/Blog/VideoLoader.astro';",
};

function importedName(line: string): string | undefined {
  const m = line.trim().match(/^import\s+(?:\{\s*(\w+)\s*\}|(\w+))\s+from/);
  return m?.[1] ?? m?.[2];
}

// True for a raw segment that's an import of a managed component (→ hide in editor).
export function isManagedImport(src: string): boolean {
  const name = importedName(src);
  return !!name && name in IMPORTS;
}

// Strip managed imports, then prepend the ones for components actually used.
export function manageImports(body: string): string {
  const cleaned = body
    .split('\n')
    .filter((l) => { const n = importedName(l); return !(n && n in IMPORTS); })
    .join('\n')
    .replace(/^\n+/, '');
  const used = Object.keys(IMPORTS).filter((n) => new RegExp(`<${n}[\\s/>]`).test(cleaned));
  const block = used.map((n) => IMPORTS[n]).join('\n');
  return block ? `${block}\n\n${cleaned}` : cleaned;
}

export function segmentMdx(body: string): Segment[] {
  let tree: { children: MdNode[] };
  try {
    tree = remark().use(remarkMdx).parse(body) as unknown as { children: MdNode[] };
  } catch {
    return [{ kind: 'raw', src: body }]; // strict-MDX parse failed → preserve whole body verbatim
  }
  const out: Segment[] = [];
  for (const node of tree.children) {
    if (!node.position) continue;
    const src = body.slice(node.position.start.offset, node.position.end.offset);
    const kind: Segment['kind'] =
      RAW_NODE.has(node.type) || (node.type === 'code' && RAW_FENCE.has(node.lang ?? '')) ? 'raw' : 'md';
    const modeled = kind === 'raw' ? modeledNode(node as MdxJsxNode) : undefined;
    const last = out[out.length - 1];
    if (last && last.kind === 'md' && kind === 'md') last.src += `\n\n${src}`;
    else out.push(modeled ? { kind, src, node: modeled } : { kind, src });
  }
  return out;
}

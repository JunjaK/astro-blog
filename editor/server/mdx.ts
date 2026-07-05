import remarkMdx from 'remark-mdx';
import { remark } from 'remark';

// Segment MDX body into prose runs vs verbatim component/special blocks, using
// real MDX-AST positions (not a line heuristic). Component regions are sliced
// from the ORIGINAL source → byte-preserved on round-trip.
export interface GalleryItem {
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  description?: string;
}
export interface LyricStanza { ja: string; ko: string }
export interface ModeledNode {
  name: string;
  attrs?: Record<string, string>;
  items?: GalleryItem[];
  stanzas?: LyricStanza[];
}
// `node` present only for a component we lift out of RawMdx into a rich editor node.
export interface Segment { kind: 'md' | 'raw'; src: string; node?: ModeledNode }

const RAW_NODE = new Set(['mdxjsEsm', 'mdxJsxFlowElement', 'mdxFlowExpression']);
const RAW_FENCE = new Set(['lyrics', 'mermaid']);

interface EstNode {
  type: string;
  name?: string;
  value?: EstNode | string | number | boolean | null;
  properties?: EstNode[];
  elements?: (EstNode | null)[];
  key?: EstNode;
  init?: EstNode;
  id?: EstNode;
  declaration?: EstNode;
  declarations?: EstNode[];
  body?: EstNode[];
  expression?: EstNode;
}
interface MdNode {
  type: string;
  lang?: string;
  value?: string; // raw content of a fenced `code` node
  position?: { start: { offset: number }; end: { offset: number } };
  data?: { estree?: EstNode };
}
interface MdxAttr { type: string; name?: string; value?: unknown }
interface MdxExprValue { value?: string; data?: { estree?: EstNode } }
interface MdxJsxNode extends MdNode { name?: string | null; attributes?: MdxAttr[]; children?: unknown[] }

// Components lifted into rich nodes. ImageLoader/VideoLoader: string-attr only.
const MODELED_ATTRS: Record<string, Set<string>> = {
  ImageLoader: new Set(['src', 'alt']),
  VideoLoader: new Set(['src']),
};
const ITEM_RE = /\{\s*src:\s*["']([^"']+)["']\s*(?:,\s*alt:\s*["']([^"']*)["'])?[^}]*\}/g;

// Fields the polaroid gallery node round-trips. `thumb: true` (boolean) is dead —
// the blog component ignores it (resolveThumb only honors a string override) — so we
// drop it. Any other field (rotate, string thumb, …) makes us bail → kept verbatim.
const POLAROID_FIELDS = new Set(['src', 'title', 'description', 'caption', 'alt']);

const isString = (v: EstNode['value']): v is string => typeof v === 'string';

// estree ArrayExpression of string-keyed object literals → gallery items, or
// undefined to keep the source verbatim (no lossy modeling).
function itemsFromArrayExpr(arr: EstNode | undefined): GalleryItem[] | undefined {
  if (!arr || arr.type !== 'ArrayExpression' || !arr.elements) return;
  const out: GalleryItem[] = [];
  for (const el of arr.elements) {
    if (!el || el.type !== 'ObjectExpression' || !el.properties) return; // hole / spread
    const item: GalleryItem = { src: '' };
    for (const p of el.properties) {
      if (p.type !== 'Property' || p.key?.type !== 'Identifier' || typeof p.key.name !== 'string') return; // spread / computed key
      const key = p.key.name;
      const v = p.value as EstNode | undefined;
      if (key === 'thumb') {
        if (v?.type === 'Literal' && typeof v.value === 'boolean') continue; // dead flag → drop
        return; // string override / expression → keep verbatim
      }
      if (!POLAROID_FIELDS.has(key)) return; // rotate / unknown → keep verbatim
      if (v?.type !== 'Literal' || !isString(v.value)) return; // non-string literal → keep verbatim
      item[key as 'src' | 'title' | 'description' | 'caption' | 'alt'] = v.value;
    }
    if (!item.src) return;
    out.push(item);
  }
  return out.length ? out : undefined;
}

// A single-declarator `export const NAME = [ {…}, … ]` → its name + parsed items.
function constItems(esm: MdNode): { name: string; items: GalleryItem[] } | undefined {
  const decl = esm.data?.estree?.body?.[0];
  if (decl?.type !== 'ExportNamedDeclaration') return;
  const vd = decl.declaration;
  if (vd?.type !== 'VariableDeclaration' || vd.declarations?.length !== 1) return;
  const d = vd.declarations[0];
  if (d.id?.type !== 'Identifier' || typeof d.id.name !== 'string') return;
  const items = itemsFromArrayExpr(d.init);
  return items ? { name: d.id.name, items } : undefined;
}

// ```lyrics fence → per-stanza raw 원문/번역 text (blank line = stanza, `||` = 원문/번역 split).
// No `||` → lyrics-only stanza (kpop / untranslated), 번역 empty. Ruby markup ({漢字|かな})
// stays inline verbatim — only the blog build tokenizes it.
function parseLyricsFence(code: string): LyricStanza[] | undefined {
  const trimmed = code.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '');
  if (!trimmed.trim()) return;
  const out: LyricStanza[] = [];
  for (const block of trimmed.split(/\n\s*\n+/)) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    const sep = lines.findIndex((l) => l.trim() === '||');
    if (sep === -1) out.push({ ja: block, ko: '' });
    else out.push({ ja: lines.slice(0, sep).join('\n'), ko: lines.slice(sep + 1).join('\n') });
  }
  return out.length ? out : undefined;
}

// → a rich node payload, or undefined to keep the segment verbatim (RawMdx).
// `consts` resolves `<Polaroid items={NAME} />`; `consumed` records which const
// arrays got inlined into a node so segmentMdx can drop their now-dead esm blocks.
function modeledNode(node: MdxJsxNode, consts: Map<string, GalleryItem[]>, consumed: Set<string>): ModeledNode | undefined {
  if (node.type !== 'mdxJsxFlowElement' || !node.name) return;

  // DiaryCarousel content={[{src,alt}, …]} → gallery node (carousel). Bail on video items.
  if (node.name === 'DiaryCarousel') {
    const attr = (node.attributes ?? []).find((a) => a.type === 'mdxJsxAttribute' && a.name === 'content');
    const expr = (attr?.value as { value?: string } | undefined)?.value;
    if (typeof expr !== 'string' || /poster:|type:\s*["']video/.test(expr)) return;
    const items: GalleryItem[] = [];
    for (const m of expr.matchAll(ITEM_RE)) items.push({ src: m[1], alt: m[2] ?? '' });
    return items.length ? { name: 'DiaryCarousel', items } : undefined;
  }

  // PolaroidGalleryScrapbook items={[…]} (inline) OR items={NAME} (const-ref) → gallery node (polaroid).
  if (node.name === 'PolaroidGalleryScrapbook') {
    const attr = (node.attributes ?? []).find((a) => a.type === 'mdxJsxAttribute' && a.name === 'items');
    const expr = (attr?.value as MdxExprValue | undefined)?.data?.estree?.body?.[0]?.expression;
    if (!expr) return;
    let items: GalleryItem[] | undefined;
    if (expr.type === 'ArrayExpression') items = itemsFromArrayExpr(expr);
    else if (expr.type === 'Identifier' && typeof expr.name === 'string') {
      items = consts.get(expr.name);
      if (items) consumed.add(expr.name);
    }
    return items?.length ? { name: 'PolaroidGalleryScrapbook', items } : undefined;
  }

  // MusicCard: frontmatter-wired marker (all props are frontmatter.X, edited in the
  // frontmatter form). Model as a fieldless block; serialize re-emits canonical wiring.
  if (node.name === 'MusicCard') return { name: 'MusicCard' };

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
  Lyrics: "import { Lyrics } from '@/components/Blog/Music';",
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
  // Lyrics is authored as a ```lyrics fence (the blog build turns it into <Lyrics>),
  // so detect it by the fence, not a JSX tag.
  const usesLyricsFence = /^```lyrics\b/m.test(cleaned);
  const used = Object.keys(IMPORTS).filter((n) =>
    n === 'Lyrics' ? usesLyricsFence : new RegExp(`<${n}[\\s/>]`).test(cleaned));
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

  // Map exported item-array consts by name so `<Polaroid items={NAME} />` resolves inline.
  const consts = new Map<string, GalleryItem[]>();
  for (const node of tree.children)
    if (node.type === 'mdxjsEsm') { const c = constItems(node); if (c) consts.set(c.name, c.items); }

  // Model raw nodes first so `consumed` is complete before we decide which consts to drop.
  const consumed = new Set<string>();
  const modeledFor = new Map<MdNode, ModeledNode | undefined>();
  for (const node of tree.children) {
    if (!node.position) continue;
    if (node.type === 'code' && node.lang === 'lyrics') {
      const stanzas = parseLyricsFence(node.value ?? '');
      modeledFor.set(node, stanzas ? { name: 'Lyrics', stanzas } : undefined);
    } else if (RAW_NODE.has(node.type) || (node.type === 'code' && RAW_FENCE.has(node.lang ?? ''))) {
      modeledFor.set(node, modeledNode(node as MdxJsxNode, consts, consumed));
    }
  }

  const out: Segment[] = [];
  for (const node of tree.children) {
    if (!node.position) continue;
    // Drop an item-const esm block once its array has been inlined into a gallery node.
    if (node.type === 'mdxjsEsm') { const c = constItems(node); if (c && consumed.has(c.name)) continue; }
    const src = body.slice(node.position.start.offset, node.position.end.offset);
    const kind: Segment['kind'] =
      RAW_NODE.has(node.type) || (node.type === 'code' && RAW_FENCE.has(node.lang ?? '')) ? 'raw' : 'md';
    const modeled = modeledFor.get(node);
    const last = out[out.length - 1];
    if (last && last.kind === 'md' && kind === 'md') last.src += `\n\n${src}`;
    else out.push(modeled ? { kind, src, node: modeled } : { kind, src });
  }
  return out;
}

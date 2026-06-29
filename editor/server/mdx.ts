import remarkMdx from 'remark-mdx';
import { remark } from 'remark';

// Segment MDX body into prose runs vs verbatim component/special blocks, using
// real MDX-AST positions (not a line heuristic). Component regions are sliced
// from the ORIGINAL source → byte-preserved on round-trip.
export interface Segment { kind: 'md' | 'raw'; src: string }

const RAW_NODE = new Set(['mdxjsEsm', 'mdxJsxFlowElement', 'mdxFlowExpression']);
const RAW_FENCE = new Set(['lyrics', 'mermaid']);

interface MdNode { type: string; lang?: string; position?: { start: { offset: number }; end: { offset: number } } }

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
    const last = out[out.length - 1];
    if (last && last.kind === 'md' && kind === 'md') last.src += `\n\n${src}`;
    else out.push({ kind, src });
  }
  return out;
}

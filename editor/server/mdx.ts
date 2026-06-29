import remarkMdx from 'remark-mdx';
import { remark } from 'remark';

// Segment MDX body into prose runs vs verbatim component/special blocks, using
// real MDX-AST positions (not a line heuristic). Component regions are sliced
// from the ORIGINAL source → byte-preserved on round-trip.
export interface Segment { kind: 'md' | 'raw'; src: string }

const RAW_NODE = new Set(['mdxjsEsm', 'mdxJsxFlowElement', 'mdxFlowExpression']);
const RAW_FENCE = new Set(['lyrics', 'mermaid']);

interface MdNode { type: string; lang?: string; position?: { start: { offset: number }; end: { offset: number } } }

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

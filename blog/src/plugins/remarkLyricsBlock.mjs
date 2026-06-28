import { parse as acornParse } from 'acorn';
import { visit } from 'unist-util-visit';
import { parseLyrics } from './lyricsParser.mjs';

function buildExpressionEstree(sourceExpression) {
  const program = acornParse(`(${sourceExpression})`, {
    ecmaVersion: 'latest',
    sourceType: 'module',
  });
  const expression = program.body[0].expression;
  return {
    type: 'Program',
    body: [{ type: 'ExpressionStatement', expression }],
    sourceType: 'module',
  };
}

function remarkLyricsBlock() {
  return function transformer(tree, file) {
    visit(tree, 'code', (code, index, parent) => {
      if (index === null || parent === null)
        return;
      if (code.lang !== 'lyrics')
        return;

      const filename = file?.path || file?.history?.[file.history.length - 1] || '';
      if (filename && !filename.endsWith('.mdx')) {
        throw new Error(
          `[remarkLyricsBlock] \`\`\`lyrics blocks require .mdx (found in ${filename}). `
          + 'Rename the file to .mdx.',
        );
      }

      let stanzas;
      try {
        stanzas = parseLyrics(code.value);
      }
      catch (err) {
        throw new Error(`[remarkLyricsBlock] ${filename}: ${err.message}`);
      }

      const stanzasSource = JSON.stringify(stanzas);

      const replacement = {
        type: 'mdxJsxFlowElement',
        name: 'Lyrics',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'stanzas',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              value: stanzasSource,
              data: {
                estree: buildExpressionEstree(stanzasSource),
              },
            },
          },
          {
            type: 'mdxJsxAttribute',
            name: 'client:visible',
            value: null,
          },
        ],
        children: [],
      };

      parent.children.splice(index, 1, replacement);
    });
  };
}

export default remarkLyricsBlock;

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const ICONS = {
  mingcute: [
    'document-2-line',
    'down-line',
    'up-line',
    'left-line',
    'right-line',
    'github-fill',
    'linkedin-fill',
    'mail-fill',
    'git-branch-line',
    'sad-fill',
  ],
  mynaui: ['sun-solid', 'moon-solid', 'code-waves-solid', 'menu', 'inbox-x'],
  tabler: ['minus', 'plus', 'rotate'],
  'svg-spinners': ['bars-rotate-fade'],
  'qlementine-icons': ['resume-16'],
  'material-symbols': ['visibility-off', 'center-focus-strong'],
};

const lines = [
  "import { addIcon } from '@iconify/react';",
  '',
];

let totalIcons = 0;

for (const [prefix, names] of Object.entries(ICONS)) {
  const jsonPath = require.resolve(`@iconify-json/${prefix}/icons.json`);
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  for (const name of names) {
    const iconData = data.icons[name];
    if (!iconData) {
      console.error(`Icon not found: ${prefix}:${name}`);
      process.exit(1);
    }

    const body = iconData.body;
    const width = iconData.width ?? data.width ?? 24;
    const height = iconData.height ?? data.height ?? 24;

    lines.push(
      `addIcon('${prefix}:${name}', { body: '${body.replace(/'/g, "\\'")}', width: ${width}, height: ${height} });`,
    );
    totalIcons++;
  }
}

lines.push('');

const outPath = join(__dirname, '..', 'src', 'utils', 'iconify-bundle.ts');
writeFileSync(outPath, lines.join('\n'));
console.log(`Bundled ${totalIcons} icons → ${outPath}`);

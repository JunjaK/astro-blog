import { createContext } from 'react';
import type { LyricsKind } from '../lib/api';

// Frontmatter lyricsType, provided by RichEditor so the Lyrics node view can adapt its
// fields (kpop = 가사만, jpop = 루비 힌트) without threading it through node attrs by hand.
export const LyricsKindContext = createContext<LyricsKind>('jpop');

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    thumbnail: z.string().optional(),
    created: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    updated: z.coerce.date().optional(),
    description: z.string().optional(),
    artist: z.string().optional(),
    album: z.string().optional(),
    releaseYear: z.number().optional(),
    appleMusicUrl: z.url().optional(),
    youtubeMusicUrl: z.url().optional(),
    lyricsType: z.enum(['jpop', 'kpop', 'pop']).optional(),
    // ── tasting note (category: 'Tasting') ──
    drinkKind: z.enum(['nihonshu', 'whisky', 'beer', 'other']).optional(),
    brewery: z.string().optional(),
    tokuteiMeisho: z
      .enum(['純米大吟醸', '大吟醸', '純米吟醸', '吟醸', '特別純米', '特別本醸造', '純米', '本醸造', '普通酒'])
      .optional(),
    riceType: z.array(z.string()).optional(),
    seimaiBuai: z.number().int().gte(0).lte(100).optional(),
    alcohol: z.number().gte(0).optional(),
    nihonshuDo: z.number().optional(),
    sando: z.number().gte(0).optional(),
    amakara: z.number().int().gte(-2).lte(2).optional(),
    noutan: z.number().int().gte(-2).lte(2).optional(),
    flavorTags: z.array(z.string()).optional(),
  }),
});

const project = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/project' }),
  schema: z.object({
    title: z.string(),
    thumbnail: z.string().optional(),
    duration: z.string(),
    techStacks: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

const playground = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/playground' }),
  schema: z.object({
    title: z.string(),
    thumbnail: z.string().optional(),
    duration: z.string(),
    techStacks: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

export const collections = { blog, project, playground };

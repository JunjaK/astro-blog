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

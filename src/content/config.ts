import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
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
  type: 'content',
  schema: z.object({
    title: z.string(),
    thumbnail: z.string().optional(),
    duration: z.string(),
    techStacks: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

const playground = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    thumbnail: z.string().optional(),
    duration: z.string(),
    techStacks: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

export const collections = { blog, project, playground };

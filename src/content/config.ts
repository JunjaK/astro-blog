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
    created: z.coerce.date(),
    category: z.string(),
    techs: z.array(z.string()).optional(),
    updated: z.coerce.date().optional(),
  }),
});

const playground = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    thumbnail: z.string().optional(),
    created: z.coerce.date(),
    category: z.string(),
    techs: z.array(z.string()).optional(),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { blog, project, playground };
